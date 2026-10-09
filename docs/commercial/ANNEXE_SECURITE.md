# Annexe sécurité, sauvegarde et réversibilité — brouillon

> Annexe 4 de l'offre commerciale. Reprend `SECURITE.md` (mesures vérifiées dans le code) et ajoute ce qu'une collectivité demande en plus : sauvegarde, restauration, continuité, réversibilité. Les passages marqués **[À CONFIRMER]** décrivent un engagement que l'éditeur n'a pas encore vérifié ou testé : ne pas les envoyer tels quels.

## 1. Mesures de sécurité en place

| Domaine | Mesure | Preuve |
|---|---|---|
| Contrôle d'accès | Règles de sécurité au niveau de chaque ligne (RLS Postgres) : un utilisateur ne modifie que ses contenus ; une mairie ne révoque que les signalements de sa commune | `SECURITE.md` A01 ; scénarios SEC-02, SEC-09, SEC-10, SEC-11, MUN-09 |
| Authentification | Supabase Auth (e-mail + mot de passe haché, sessions JWT) ; aucune clé secrète côté navigateur | `SECURITE.md` A02, A07 |
| Chiffrement en transit | HTTPS partout (Traefik, certificats Let's Encrypt renouvelés automatiquement) | `ARCHITECTURE.md` |
| Intégrité du code | Typecheck, lint, tests (195) et audit des dépendances à chaque modification ; build reproductible ; déploiement par tag | `SECURITE.md` A06, A08 ; CI |
| Supervision | Prometheus, Grafana, alertes ; Sentry (erreurs) ; fail2ban (SSH) ; télémétrie des refus d'autorisation | `SECURITE.md` A09 |
| Accessibilité | RGAA 4.1, contrôles axe-core sur tous les écrans | `ACCESSIBILITE.md` ; page `/accessibilite` |
| Données personnelles | Hébergement UE, suppression de compte en libre-service (purge à J+30), mesure d'audience sans cookie | page `/confidentialite` |

## 2. Hébergement et localisation

- Base de données, authentification, fichiers : Supabase, AWS **Irlande**.
- Application web, supervision, mesure d'audience : OVH, **France**.
- Mails : Resend (États-Unis) ; erreurs applicatives : Sentry (États-Unis). Clauses contractuelles types. **[À CONFIRMER : région de traitement proposée par ces deux prestataires, option UE si disponible.]**

## 3. Sauvegarde et restauration

**État actuel** : le plan Supabase gratuit n'offre ni sauvegarde exploitable ni engagement. **Prérequis avant tout engagement : passage au plan Pro.**

Engagement à proposer **[À CONFIRMER après passage en Pro et test de restauration]** :

| Élément | Engagement |
|---|---|
| Sauvegarde de la base | Quotidienne, automatique (Supabase Pro), conservation 7 jours |
| Fichiers (photos, avatars) | Stockés dans Supabase Storage ; **non couverts par les sauvegardes de la base** → export périodique à prévoir |
| Perte de données maximale (RPO) | 24 h (sauvegarde quotidienne) ; moins avec l'option « Point-in-Time Recovery » (payante) |
| Délai de remise en service (RTO) | 4 h ouvrées **[À CONFIRMER par un test]** |
| Test de restauration | Une fois par trimestre, sur un projet Supabase vierge, résultat consigné dans `MAINTENANCE.md` |

**Procédure de restauration (à dérouler et chronométrer une première fois)** :

1. Dashboard Supabase → *Database → Backups* → restaurer la sauvegarde voulue sur un **nouveau projet**.
2. Vérifier : nombre de lignes de `issues`, `comments`, `votes`, `users` ; ouverture d'un signalement avec photo.
3. Mettre à jour `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` (secrets GitHub), reposer les secrets des Edge Functions (`supabase secrets set …`), redéployer les fonctions (`supabase functions deploy`).
4. Pousser un tag `vX.Y.Z` pour redéployer le front avec les nouvelles clés.
5. Consigner la date, la cause, la durée et la perte éventuelle.

L'application web (nginx) est sans état : elle se reconstruit depuis l'image publiée sur GHCR (`MANUEL_DEPLOIEMENT.md` §8).

## 4. Continuité

- Panne de l'application web : redéploiement de l'image depuis GHCR sur le VPS (≈ 15 min). **[À CONFIRMER]**
- Panne du VPS : réinstallation selon `MANUEL_DEPLOIEMENT.md` §8.2 ; les données de l'application sont chez Supabase, pas sur le VPS (seuls Matomo et Grafana y ont un état).
- Panne de Supabase : dépendance directe, sans solution de repli ; le statut est suivi sur la page de statut de Supabase.
- Incident de sécurité ou violation de données : notification de la collectivité sous **48 h** après connaissance de l'incident ; notification CNIL par le responsable de traitement sous 72 h.

## 5. Réversibilité : export des données d'une commune

À la fin du contrat, l'éditeur remet les signalements de la commune en CSV, sous 30 jours. Requêtes à lancer dans l'éditeur SQL Supabase (remplacer `34057` par le code INSEE de la commune (`issues.city_insee`)), puis *Download CSV* :

```sql
-- Signalements de la commune (hors données personnelles de l'auteur)
select * from public.issues where city_insee = '34057';

-- Tâches, matériel, commentaires, votes rattachés
select t.* from public.tasks t join public.issues i on i.id = t.issue_id where i.city_insee = '34057';
select m.* from public.materials m join public.issues i on i.id = m.issue_id where i.city_insee = '34057';
select c.* from public.comments c join public.issues i on i.id = c.id_issue where i.city_insee = '34057';
select v.* from public.votes v join public.issues i on i.id = v.id_issue where i.city_insee = '34057';
```

- Les photos se récupèrent via leurs adresses (`issues.image_url`), à télécharger en lot.
- Les notes privées des agents (`issue_private_notes`) sont remises à la collectivité sur demande, ainsi que les e-mails de propriétaires (`issue_owner_contacts`, `where issue_id in (select id from public.issues where city_insee = '34057')`).
- **Suppression** sous 90 jours : désactivation des comptes « mairie » (`update public.users set role = 'citizen' where …`) ; les signalements des habitants restent sur la plateforme, qui est commune à toutes les communes (la plateforme n'est pas dédiée à une collectivité). **[À CONFIRMER avec la collectivité : à intégrer au contrat, car « supprimer les données de la commune » n'est pas possible sans supprimer les contenus des habitants.]**
