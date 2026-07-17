# Sécurité — City Spot

## 1. Objet du document

Ce document mappe explicitement les mesures de sécurité mises en œuvre dans City Spot aux 10 catégories de risques de l'**OWASP Top 10 (édition 2021)**. Il répond au critère C2.2.3 de la grille d'évaluation :
- *« Les mesures prises permettent de couvrir les 10 failles de sécurité principales décrites par l'OWASP »*

Chaque catégorie précise : la mesure en place, le fichier qui l'implémente, et le scénario du `CAHIER_DE_RECETTES.md` ou du `PLAN_CORRECTION_BOGUES.md` qui la vérifie. Les catégories partiellement ou non couvertes sont assumées comme telles plutôt que masquées.

## 2. Mapping

| Catégorie OWASP | Mesure en place | Implémentation | Vérifié par |
|---|---|---|---|
| **A01:2021 – Broken Access Control** | RLS Postgres sur `issues`/`tasks`/`materials`/`comments`/`votes`/`users` (lecture ouverte, écriture réservée au propriétaire) ; garde de route côté client sur `/municipal` ; vérification serveur de propriété avant suppression | `supabase/migrations/*_rls.sql` ; `src/components/Layout.tsx` (garde de route) ; `supabase/functions/delete-issue/index.ts` (vérif. `issue.created_by`) | SEC-02, SEC-09, SEC-10, SEC-11 ; `PLAN_CORRECTION_BOGUES.md` BUG-01, BUG-05, BUG-10, BUG-13 |
| **A02:2021 – Cryptographic Failures** | Aucune clé secrète/service-role ne peut être chargée côté client — rejet explicite si la clé commence par `sb_secret_` ; mots de passe gérés et hashés par Supabase Auth (jamais stockés/manipulés par le code applicatif) | `src/lib/supabase.ts` (`isSecretKey`, `getSupabaseClient`) | SEC-01 ; test dédié dans `src/lib/supabase.test.ts` (cf. `TESTS.md`) |
| **A03:2021 – Injection** | Toutes les requêtes passent par le client Supabase (PostgREST, requêtes paramétrées) — aucune concaténation SQL manuelle dans le code applicatif ; validation stricte des entrées de formulaire (types, longueurs, formats) avant tout envoi | `src/services/issuesService.ts` (`.from(...)`, jamais de SQL brut) ; `src/schemas/formSchemas.ts` (schémas Zod) | Couvert indirectement par les tests de formulaire (`CreatePost.test.tsx`, `Settings.test.tsx`) |
| **A04:2021 – Insecure Design** | Le tally de votes (`positive_votes`/`negative_votes`) est recalculé côté serveur par trigger — un payload client falsifié est ignoré ; un compte ne peut voter qu'une fois par signalement (contrainte d'unicité) ; upload limité en taille et type déclaré (5 Mo, MIME whitelisté), images encodées côté client sans passer par un service de stockage tiers | Trigger DB (cf. `PLAN_CORRECTION_BOGUES.md`) ; migration `*_add_votes_unique_constraint.sql` ; `src/components/CreatePost.tsx` (`isAllowedImageFile`/`isAllowedDocumentFile`) | SEC-04, SEC-05, SEC-06, SEC-07 ; BUG-09 |
| **A05:2021 – Security Misconfiguration** | En-têtes HTTP de sécurité sur les réponses nginx (`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`) ; secrets Docker injectés via `--secret` (jamais en clair, jamais dans `docker history`) ; RLS activée par défaut sur toutes les tables exposées (pas de policy permissive résiduelle) | `nginx.conf` ; `MANUEL_DEPLOIEMENT.md` §3 | SEC-08 |
| **A06:2021 – Vulnerable and Outdated Components** | Audit des dépendances effectué ponctuellement (`npm audit`) — une mise à jour ciblée de Vite a résolu 3 vulnérabilités hautes | `README.md` (§ Avancée du jour avec IA) ; procédure documentée dans `MANUEL_MISE_A_JOUR.md` §7.2 | Non rejoué automatiquement en CI (voir §3, gap) |
| **A07:2021 – Identification and Authentication Failures** | Authentification déléguée à Supabase Auth (email + mot de passe, sessions JWT, pas de logique maison) ; l'appel serveur de suppression exige un en-tête `Authorization` valide et rejette toute requête non authentifiée | `src/services/authService.ts` ; `supabase/functions/delete-issue/index.ts` | SEC-03 |
| **A08:2021 – Software and Data Integrity Failures** | CI (`test:coverage` + `build`) bloque la fusion sur `main` en cas d'échec ; toute évolution de schéma passe par une migration versionnée relue avant application | `.github/workflows/ci.yml` | — |
| **A09:2021 – Security Logging and Monitoring Failures** | ⚠️ Non couvert — aucun logging applicatif ni supervision des événements de sécurité (tentatives d'accès refusées, échecs d'authentification) au-delà des logs par défaut de la plateforme Supabase | — | — |
| **A10:2021 – Server-Side Request Forgery (SSRF)** | Aucun appel serveur vers une URL fournie par l'utilisateur — le seul appel externe (géocodage inverse) est déclenché côté client vers une URL fixe non paramétrable par l'utilisateur | `src/constants/map.ts` (`NOMINATIM_REVERSE_GEOCODE_URL`) | Risque non applicable en l'état (pas de composant serveur qui suit une URL utilisateur) |

## 3. Limites assumées

- **A06** — l'audit de dépendances a été fait manuellement, une fois ; il n'est pas rejoué à chaque run de CI. Ajouter une étape `npm audit --audit-level=high` à `.github/workflows/ci.yml` fermerait ce point.
- **A09** — aucune télémétrie applicative sur les événements de sécurité (403/401 renvoyés par `delete-issue`, tentatives d'accès à `/municipal`). À ce stade du projet, ce sont les tests de `CAHIER_DE_RECETTES.md` qui font office de détection, pas une supervision en production.
- **CORS de `delete-issue`** — la fonction Edge répond avec `Access-Control-Allow-Origin: '*'` (cf. `supabase/functions/delete-issue/index.ts`). L'endpoit reste protégé par l'authentification JWT et la vérification de propriété (A01/A07), mais restreindre l'origine au domaine de production serait la prochaine amélioration de configuration (A05).
- **`package-lock.json`** absent du dépôt (volontaire, cf. `MANUEL_DEPLOIEMENT.md` §7) : les builds ne sont pas strictement reproductibles bit-à-bit, ce qui nuance A08 sans l'invalider (les versions restent bornées par `package.json`).
