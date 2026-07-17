-- BUG-12 (PLAN_CORRECTION_BOGUES.md), option A retenue : le statut municipal
-- avait deux sources de vérité indépendantes et non synchronisées
-- (user_metadata.role, qui contrôle l'accès à /municipal, et
-- public.users.cityWorker, qui ne contrôlait que le badge du profil).
-- cityWorker est retiré ; le badge dérive désormais de role directement.
alter table public.users
  drop column if exists "cityWorker";
