-- La purge d'un compte (J+30) efface aussi le code INSEE de son profil (nouvelle colonne
-- users.city_insee, cf. 20261010010000). Reste identique à la version de 20260929050000.
-- On n'écrit jamais dans le schéma `auth` : l'adresse e-mail de connexion n'est pas touchée ici.
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
        or city_insee is not null
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
          city_insee = null,
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

revoke execute on function public.purge_deleted_accounts() from public, anon, authenticated;
