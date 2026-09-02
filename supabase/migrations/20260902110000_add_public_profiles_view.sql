-- Page de profil publique (clic sur le pseudo d'un membre, ex. dans les
-- commentaires). public.users bloque la lecture de la ligne d'un autre
-- utilisateur (RLS "Users can view their own profile", SEC-11) — impossible
-- de relire name/avatar/city d'un tiers depuis le client. Cette vue expose
-- volontairement un sous-ensemble sûr (jamais phone/address), uniquement
-- pour les comptes ayant activé "Visibilité du profil" (Settings).
create view public.public_profiles as
select id, name, avatar, city, role
from public.users
where "profileVisible" = true;

grant select on public.public_profiles to authenticated, anon;
