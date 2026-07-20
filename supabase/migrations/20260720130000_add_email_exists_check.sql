-- Vérification d'email existant côté client, sans exposer auth.users (schéma
-- protégé, inaccessible depuis l'anon key). SECURITY DEFINER : la fonction
-- s'exécute avec les droits du propriétaire (accès à auth.users), mais ne
-- renvoie qu'un booléen — aucune donnée personnelle n'est exposée.
--
-- Ne vérifie que auth.users : c'est la source canonique de l'email (public.users
-- n'en stocke pas de copie). Une ligne public.users supprimée manuellement sans
-- supprimer la ligne auth.users correspondante est donc bien détectée par ce
-- seul contrôle.
create or replace function public.email_exists(check_email text)
returns boolean
language sql
security definer
set search_path = public, auth
as $$
  select exists (
    select 1 from auth.users where lower(email) = lower(trim(check_email))
  );
$$;

revoke all on function public.email_exists(text) from public;
grant execute on function public.email_exists(text) to anon, authenticated;
