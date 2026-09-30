-- Corrections suite à la revue finale du plan de suppression de compte : cf.
-- docs/superpowers/plans/2026-09-29-account-deletion.md (revue finale).

-- I1 : la policy UPDATE existante sur public.users ("Users can update their
-- own profile", utilisée par Settings.tsx/updateUserProfile) n'a aucune
-- restriction de colonne — un compte pouvait donc réinitialiser deleted_at
-- lui-même via un appel REST direct, contournant restore_own_account() (et
-- sa fenêtre de 30 jours) et même ressusciter un compte déjà purgé. Ce
-- trigger bloque toute écriture directe (anon/authenticated) qui touche
-- deleted_at, ou toute écriture sur une ligne déjà marquée supprimée — les
-- fonctions security definer de ce module (current_user = propriétaire de la
-- fonction, pas anon/authenticated, pendant leur exécution) ne sont pas
-- affectées.
create or replace function public.prevent_deleted_at_tampering()
returns trigger
language plpgsql
as $$
begin
  if current_user in ('anon', 'authenticated') then
    if new.deleted_at is distinct from old.deleted_at then
      raise exception 'deleted_at cannot be modified directly; use delete_own_account()/restore_own_account()';
    end if;
    if old.deleted_at is not null then
      raise exception 'account is deleted; profile cannot be updated';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists prevent_deleted_at_tampering on public.users;
create trigger prevent_deleted_at_tampering
  before update on public.users
  for each row execute function public.prevent_deleted_at_tampering();

-- I2 : purge_deleted_accounts() n'avait ni revoke ni grant explicite — les
-- privilèges par défaut de Supabase l'exposaient à anon/authenticated alors
-- que seul pg_cron (rôle postgres) doit pouvoir l'exécuter.
revoke execute on function public.purge_deleted_accounts() from public, anon, authenticated;
revoke execute on function public.delete_own_account() from anon;
revoke execute on function public.restore_own_account() from anon;

-- C1 + I3 : purge_deleted_accounts() échouait systématiquement sur le DELETE
-- direct de storage.objects (Supabase bloque ce DELETE hors de son API sauf
-- storage.allow_delete_query='true' pour cette transaction), ce qui annulait
-- aussi l'anonymisation de public.users dans la même transaction — la purge
-- ne se produisait donc jamais. Isolé dans son propre bloc exception pour
-- qu'un échec de nettoyage du storage ne bloque plus jamais l'anonymisation.
-- Le garde d'idempotence reposait aussi sur `name`, un champ que l'utilisateur
-- contrôle : se renommer "Utilisateur supprimé" avant suppression le faisait
-- ignorer indéfiniment par la purge. Remplacé par un test sur l'ensemble des
-- champs PII réels (name inclus, mais plus seul) : une ligne n'est ignorée
-- que si TOUS ces champs sont déjà à leur valeur purgée.
create or replace function public.purge_deleted_accounts()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target record;
begin
  for target in
    select id from public.users
    where deleted_at is not null
      and deleted_at < now() - interval '30 days'
      and (
        name is distinct from 'Utilisateur supprimé'
        or phone is not null
        or address is not null
        or avatar is not null
        or city is not null
        or "cityLat" is not null
        or "cityLng" is not null
        or "profileVisible" = true
      )
  loop
    update public.users
      set name = 'Utilisateur supprimé',
          phone = null,
          address = null,
          avatar = null,
          city = null,
          "cityLat" = null,
          "cityLng" = null,
          "profileVisible" = false
      where id = target.id;

    begin
      perform set_config('storage.allow_delete_query', 'true', true);
      delete from storage.objects
        where bucket_id = 'avatars'
          and (storage.foldername(name))[1] = target.id::text;
    exception when others then
      raise warning 'purge_deleted_accounts: storage cleanup failed for %: %', target.id, sqlerrm;
    end;
  end loop;
end;
$$;
