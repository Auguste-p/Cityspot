-- Purge définitive à J+30 : cf.
-- docs/superpowers/specs/2026-09-29-account-deletion-design.md.
-- Prérequis MANUEL (hors migration, à faire une fois avant de pousser ce
-- fichier) : activer l'extension pg_cron — Database → Extensions dans le
-- dashboard Supabase. Sans elle, `cron.schedule` ci-dessous échoue.
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
      and name is distinct from 'Utilisateur supprimé'  -- déjà purgé, ignore
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

    delete from storage.objects
      where bucket_id = 'avatars'
        and (storage.foldername(name))[1] = target.id::text;
  end loop;
end;
$$;

select cron.schedule(
  'purge-deleted-accounts',
  '0 3 * * *',
  $$select public.purge_deleted_accounts();$$
);
