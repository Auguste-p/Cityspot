-- Rattachement d'un signalement / d'un compte mairie à une commune par son code INSEE
-- (5 caractères : 2 chiffres ou 2A/2B, puis 3 chiffres), au lieu du nom de ville :
-- les homonymes (Saint-Denis, Castelnau-…) ne se confondent plus.
--
-- `city` (nom) reste pour l'affichage ; `city_insee` devient la clé d'autorisation.
--
-- ⚠️ Ordre de mise en production :
--   1. pousser cette migration ;
--   2. lancer `node scripts/backfill-insee.mjs --apply` (renseigne city_insee des lignes
--      existantes — sans ça, une mairie ne voit plus rien tant que son compte n'a pas de code) ;
--   3. déployer le front (tag vX.Y.Z) et redéployer la fonction notify-mairie.
alter table public.users
  add column city_insee text check (city_insee is null or city_insee ~ '^([0-9]{2}|2A|2B)[0-9]{3}$');

alter table public.issues
  add column city_insee text check (city_insee is null or city_insee ~ '^([0-9]{2}|2A|2B)[0-9]{3}$');

create index issues_city_insee_idx on public.issues (city_insee) where city_insee is not null;

-- Remplace is_municipal_of_city(text) (comparaison de noms de ville).
create function public.is_municipal_of_insee(p_insee text)
returns boolean
language sql
stable
as $$
  select p_insee is not null and exists (
    select 1 from public.users
    where id = auth.uid() and role = 'municipal' and deleted_at is null
      and city_insee = p_insee
  );
$$;

-- Un signalement révoqué n'est lisible que par son auteur et la mairie de sa commune.
drop policy "Authenticated users can read issues" on public.issues;
create policy "Authenticated users can read issues"
  on public.issues for select
  to authenticated
  using (revoked_at is null or created_by = auth.uid() or public.is_municipal_of_insee(city_insee));

create or replace function public.revoke_issue(p_issue_id text, p_reason text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reason text := trim(coalesce(p_reason, ''));
  v_updated int;
begin
  if char_length(v_reason) not between 1 and 500 then
    raise exception 'Le motif de révocation est obligatoire (500 caractères max)';
  end if;

  update public.issues
  set revoked_at = now(), revoked_by = auth.uid(), revoked_reason = v_reason
  where id = p_issue_id
    and revoked_at is null
    and public.is_municipal_of_insee(city_insee);

  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    raise exception 'Révocation refusée : signalement introuvable, déjà révoqué ou hors de votre commune';
  end if;
end;
$$;

drop function public.is_municipal_of_city(text);

-- Le code INSEE de l'inscription part dans user_metadata (cityInsee), comme le reste du profil.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, name, city, "cityLat", "cityLng", city_insee, created_at)
  values (
    new.id,
    new.raw_user_meta_data ->> 'name',
    new.raw_user_meta_data ->> 'city',
    (new.raw_user_meta_data ->> 'cityLat')::double precision,
    (new.raw_user_meta_data ->> 'cityLng')::double precision,
    nullif(new.raw_user_meta_data ->> 'cityInsee', ''),
    new.created_at
  );
  return new;
end;
$$;

-- city_insee est désormais une clé d'autorisation : un agent ne doit pas pouvoir se rattacher
-- lui-même à une autre commune, ni personne se promouvoir « mairie ». La policy UPDATE de
-- public.users n'est pas versionnée et n'a pas de restriction de colonne connue : on borne ici,
-- pour les rôles API uniquement (SQL direct, fonctions security definer et clé service passent).
create function public.guard_users_privileged_columns()
returns trigger
language plpgsql
as $$
begin
  if current_user in ('anon', 'authenticated') then
    if tg_op = 'INSERT' then
      if new.role is distinct from 'citizen' then
        raise exception 'role cannot be set directly';
      end if;
    else
      if new.role is distinct from old.role then
        raise exception 'role cannot be modified directly';
      end if;
      if old.role = 'municipal' and new.city_insee is distinct from old.city_insee then
        raise exception 'city_insee of a municipal account cannot be modified directly';
      end if;
    end if;
  end if;
  return new;
end;
$$;

create trigger guard_users_privileged_columns
  before insert or update on public.users
  for each row execute function public.guard_users_privileged_columns();
