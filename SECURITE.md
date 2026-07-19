# Sécurité — City Spot

## 1. Objet du document

Ce document mappe explicitement les mesures de sécurité mises en œuvre dans City Spot aux 10 catégories de risques de l'**OWASP Top 10 (édition 2021)**. Il répond au critère C2.2.3 de la grille d'évaluation :
- *« Les mesures prises permettent de couvrir les 10 failles de sécurité principales décrites par l'OWASP »*

Chaque catégorie précise : la mesure en place, le fichier qui l'implémente, et le scénario du `CAHIER_DE_RECETTES.md` ou du `PLAN_CORRECTION_BOGUES.md` qui la vérifie. Les catégories partiellement ou non couvertes sont assumées comme telles plutôt que masquées.

## 2. Mapping

| Catégorie OWASP | Mesure en place | Implémentation | Vérifié par |
|---|---|---|---|
| **A01:2021 – Broken Access Control** | RLS Postgres sur `issues`/`tasks`/`materials`/`comments`/`votes`/`users` (lecture ouverte, écriture **et suppression** réservées au propriétaire) ; garde de route côté client sur `/municipal` | `supabase/migrations/*_rls.sql` ; `src/components/Layout.tsx` (garde de route) ; `src/services/issuesService.ts` (`deleteIssue`, RLS directe, plus d'Edge Function dédiée — cf. `CHANGELOG.md`) | SEC-02, SEC-09, SEC-10, SEC-11 ; `PLAN_CORRECTION_BOGUES.md` BUG-01, BUG-05, BUG-10, BUG-13 |
| **A02:2021 – Cryptographic Failures** | Aucune clé secrète/service-role ne peut être chargée côté client — rejet explicite si la clé commence par `sb_secret_` ; mots de passe gérés et hashés par Supabase Auth (jamais stockés/manipulés par le code applicatif) | `src/lib/supabase.ts` (`isSecretKey`, `getSupabaseClient`) | SEC-01 ; test dédié dans `src/lib/supabase.test.ts` (cf. `TESTS.md`) |
| **A03:2021 – Injection** | Toutes les requêtes passent par le client Supabase (PostgREST, requêtes paramétrées) — aucune concaténation SQL manuelle dans le code applicatif ; validation stricte des entrées de formulaire (types, longueurs, formats) avant tout envoi | `src/services/issuesService.ts` (`.from(...)`, jamais de SQL brut) ; `src/schemas/formSchemas.ts` (schémas Zod) | Couvert indirectement par les tests de formulaire (`CreatePost.test.tsx`, `Settings.test.tsx`) |
| **A04:2021 – Insecure Design** | Le tally de votes (`positive_votes`/`negative_votes`) est recalculé côté serveur par trigger — un payload client falsifié est ignoré ; un compte ne peut voter qu'une fois par signalement (contrainte d'unicité) ; upload limité en taille et type déclaré (5 Mo, MIME whitelisté), images encodées côté client sans passer par un service de stockage tiers | Trigger DB (cf. `PLAN_CORRECTION_BOGUES.md`) ; migration `*_add_votes_unique_constraint.sql` ; `src/components/CreatePost.tsx` (`isAllowedImageFile`/`isAllowedDocumentFile`) | SEC-04, SEC-05, SEC-06, SEC-07 ; BUG-09 |
| **A05:2021 – Security Misconfiguration** | En-têtes HTTP de sécurité sur les réponses nginx (`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`) ; secrets Docker injectés via `--secret` (jamais en clair, jamais dans `docker history`) ; RLS activée par défaut sur toutes les tables exposées (pas de policy permissive résiduelle) | `nginx.conf` ; `MANUEL_DEPLOIEMENT.md` §3 | SEC-08 |
| **A06:2021 – Vulnerable and Outdated Components** | `npm audit --audit-level=high` rejoué à chaque push/PR vers `main` — le build échoue si une vulnérabilité haute/critique est introduite ; une mise à jour ciblée de Vite avait déjà résolu 3 vulnérabilités hautes en amont | `.github/workflows/ci.yml` ; procédure manuelle documentée dans `MANUEL_MISE_A_JOUR.md` §6.2 | CI (`ci.yml`) à chaque push/PR |
| **A07:2021 – Identification and Authentication Failures** | Authentification déléguée à Supabase Auth (email + mot de passe, sessions JWT, pas de logique maison) ; toute requête (lecture ou écriture) est évaluée par PostgREST avec le JWT de l'appelant, RLS s'applique identiquement qu'on soit authentifié ou anonyme | `src/services/authService.ts` | SEC-03 |
| **A08:2021 – Software and Data Integrity Failures** | CI (`test:coverage` + `build`) bloque la fusion sur `main` en cas d'échec ; toute évolution de schéma passe par une migration versionnée relue avant application | `.github/workflows/ci.yml` | — |
| **A09:2021 – Security Logging and Monitoring Failures** | Supervision infra (Prometheus/Grafana), tracking d'erreurs frontend (Sentry), anti brute-force SSH (fail2ban), télémétrie applicative (tout refus d'autorisation métier — garde `/municipal`, suppression/modification bloquée par la RLS — envoie un événement Sentry dédié, `logSecurityEvent`, tag `security_event:true`), **règle d'alerte Sentry sur ce tag** et **revue des logs de requêtes Supabase** configurées le 2026-07-19 (détail §4) | `MANUEL_DEPLOIEMENT.md` §8.4 ; `src/lib/sentry.ts` (`logSecurityEvent`) ; `src/components/Layout.tsx` ; `src/services/issuesService.ts` (`deleteIssue`, `updateIssue`) ; dashboards Sentry/Supabase | Test dédié `src/lib/sentry.test.ts` ; SEC-02/SEC-03/SEC-09/SEC-10 déclenchent ces refus |
| **A10:2021 – Server-Side Request Forgery (SSRF)** | Aucun appel serveur vers une URL fournie par l'utilisateur — le seul appel externe (géocodage inverse) est déclenché côté client vers une URL fixe non paramétrable par l'utilisateur | `src/constants/map.ts` (`NOMINATIM_REVERSE_GEOCODE_URL`) | Risque non applicable en l'état (pas de composant serveur qui suit une URL utilisateur) |

## 3. Limites assumées

- **`package-lock.json`** absent du dépôt (volontaire, cf. `MANUEL_DEPLOIEMENT.md` §7) : les builds ne sont pas strictement reproductibles bit-à-bit, ce qui nuance A08 sans l'invalider (les versions restent bornées par `package.json`).

## 4. A09 — configuration de supervision (dashboards, hors code)

Contrairement à A06 (fermé par un gate CI automatique, `.github/workflows/ci.yml`), les deux mesures suivantes sont des **configurations de dashboard**, pas du code versionné dans ce dépôt — appliquées manuellement le **2026-07-19**.

**1. Alerte Sentry sur volume anormal d'événements de sécurité**
Le tag `security_event:true` (posé par `logSecurityEvent`, cf. §2) permet une règle d'alerte qui ne réagit qu'à ces refus, jamais à un crash JS classique :
- Sentry → *Alerts* → *Create Alert* → *Issues*.
- Filtre : `tags.security_event:true`.
- Condition : *"An issue is seen more than X times in Y minutes"* (un usage normal ne génère quasiment jamais ce refus, un scan/brute-force applicatif si).
- Action : notification vers l'adresse du projet.

**2. Logs de requêtes côté Supabase**
Ce sont les seuls logs qui verraient un contournement *complet* du frontend (appel REST direct sans passer par l'app) — `logSecurityEvent` ne peut par nature pas les voir, il ne s'exécute que dans le navigateur.
- Dashboard Supabase → *Logs* → *API/PostgREST Logs*, filtrable par méthode `DELETE`/`PATCH` sur `issues`/`tasks`/`materials`/`comments`/`votes` pour repérer des tentatives répétées avec 0 ligne affectée (signature d'un refus RLS, cf. `PLAN_CORRECTION_BOGUES.md` BUG-10).
- Pas d'alerte automatique native sur ces logs côté Supabase (plan gratuit) — revue ponctuelle, pas continue ; à revoir si le besoin de détection temps réel sur ce point précis devient critique.
