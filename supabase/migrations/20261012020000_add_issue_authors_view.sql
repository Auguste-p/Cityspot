-- Nom du créateur d'un signalement, affiché sur son détail.
--
-- `public.users` n'est lisible que par son propriétaire (SEC-11) : un autre compte ne peut pas relire
-- le nom d'un auteur. Même solution que `public_profiles` : une vue (exécutée avec les droits de son
-- propriétaire) qui n'expose que le strict nécessaire — l'id du signalement et le NOM de son auteur,
-- jamais l'e-mail, le téléphone, l'adresse ni l'identifiant du compte.
--
-- Décision de produit : le nom est montré à tous les comptes connectés, comme celui d'un auteur de
-- commentaire (`comments.author_name`), indépendamment de « Visibilité du profil ». Un compte supprimé
-- apparaît comme « Utilisateur supprimé » (la purge de J+30 y renomme aussi le profil). Un signalement
-- révoqué ne révèle son auteur qu'à lui-même et à la mairie de sa commune, comme le signalement.
create view public.issue_authors as
select
  i.id as issue_id,
  case when u.deleted_at is null then u.name else 'Utilisateur supprimé' end as author_name
from public.issues i
join public.users u on u.id = i.created_by
where i.revoked_at is null
   or i.created_by = auth.uid()
   or public.is_municipal_of_insee(i.city_insee);

revoke all on public.issue_authors from public, anon;
grant select on public.issue_authors to authenticated;
