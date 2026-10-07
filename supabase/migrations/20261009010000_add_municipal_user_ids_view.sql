-- Badge « Mairie » sur les commentaires : public.users n'est lisible que par son propriétaire
-- (RLS, SEC-11), un citoyen ne peut donc pas lire le rôle de l'auteur d'un commentaire.
-- Cette vue n'expose que l'identifiant des comptes mairie actifs (ni nom, ni e-mail, ni ville),
-- sur le modèle de `public_profiles` ; le statut mairie est de toute façon affiché publiquement.
-- Réservée aux utilisateurs connectés. Toujours exacte : un compte rétrogradé perd son badge.
create view public.municipal_user_ids as
select id from public.users
where role = 'municipal' and deleted_at is null;

revoke all on public.municipal_user_ids from public, anon;
grant select on public.municipal_user_ids to authenticated;
