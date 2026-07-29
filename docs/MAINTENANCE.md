# Maintenance en condition opérationnelle — City Spot

## 1. Objet du document

Ce document répond aux critères **C4.1.1, C4.1.2, C4.2.1, C4.2.2, C4.3.1** de la grille d'évaluation (BLOC 4 — *Maintenir l'application logicielle en condition opérationnelle*). Il ne duplique pas ce qui existe déjà dans les autres documents — il les cite explicitement là où la preuve est déjà écrite, et complète uniquement ce qui manquait comme livrable autonome.

## 2. C4.1.1 — Processus de mise à jour des dépendances

Critère : *« Le processus de mise à jour des dépendances précise la fréquence, le périmètre logiciel concerné, le type de mise à jour (automatique ou manuel) »*.

| Aspect | Réponse |
|---|---|
| **Fréquence** | Automatique et systématique à chaque `push`/PR vers `main` pour la détection (`npm audit`) ; à la demande pour la montée de version elle-même (pas de cadence calendaire fixée). |
| **Périmètre** | L'ensemble des dépendances npm du projet (`package.json`/`package-lock.json`) — frontend uniquement, Supabase (backend managé) n'a pas de dépendances applicatives à mettre à jour côté code. |
| **Type** | **Détection** : automatique, `npm audit --audit-level=high` rejoué à chaque push/PR (`.github/workflows/ci.yml`) — le build échoue si une vulnérabilité haute/critique est introduite. **Mise à jour** : manuelle, procédure documentée dans `MANUEL_MISE_A_JOUR.md` §6.2 (`npm outdated` → `npm audit` → `npm update` → `npm run build && npm test`). |

**Preuve** : `.github/workflows/ci.yml` (étape `npm audit --omit=dev --audit-level=high`), `SECURITE.md` (A06:2021, fermé depuis le 2026-07-19), `MANUEL_MISE_A_JOUR.md` §6.2.

**Écart assumé** : pas d'outil de veille automatique des nouvelles versions (type Dependabot/Renovate) — la détection de vulnérabilités est automatique, mais la connaissance d'une nouvelle version disponible reste manuelle (`npm outdated` lancé à la main). Cf. §7.

**Incident du 2026-07-29** : `npm audit --audit-level=high` a fait échouer la CI sur 3 avis de sécurité. Traitement :
- `postcss` et `react-router` (dépendances de production) : corrigés par `npm audit fix` (montée de version non cassante).
- `brace-expansion` (via `minimatch@3.1.5`, imbriqué dans les dépendances propres d'`eslint` et d'`eslint-plugin-jsx-a11y`) : aucun correctif non cassant disponible — la seule version corrigée reconnue par l'avisory (`5.0.8`) change la forme de l'API (`require('brace-expansion')` n'exporte plus une fonction directement), incompatible avec l'ancien `minimatch@3.1.5` utilisé en interne par `eslint`. Monter `eslint` en v10 (qui ne dépend plus de cette chaîne) casse à son tour `eslint-plugin-jsx-a11y@6.10.2`, dont le `peerDependencies` ne déclare le support que jusqu'à `eslint@^9`. Bogue purement outillage (lint), jamais exécuté en production ni exposé à une entrée utilisateur.
- **Décision** : porter le gate `npm audit` sur `--omit=dev` (dépendances de production uniquement). Les dépendances de production restent intégralement propres (0 vulnérabilité) ; le résidu dev-only reste visible via `npm audit` en local, sans bloquer la CI. Détail : §7.

## 3. C4.1.2 — Système de supervision et d'alerte

Critère : *« Le système de supervision est adapté à la typologie de logiciel développé, les sondes et leur finalité sont explicitées, permet de surveiller la disponibilité du logiciel »*.

Le périmètre de supervision couvre trois couches : infrastructure, application, sécurité.

| Sonde | Couche | Finalité | Accès |
|---|---|---|---|
| `node-exporter` | Infra (hôte) | Métriques CPU/RAM/disque du VPS | Interne, scrappé par Prometheus (`prometheus.yml`) |
| `cadvisor` | Infra (conteneurs) | Métriques par conteneur Docker (CPU/RAM/réseau) | Interne, scrappé par Prometheus |
| `traefik` (métriques) | Infra (reverse proxy) | Latence et volume de requêtes par service routé | Interne, scrappé par Prometheus |
| `grafana` | Dashboards | Visualisation des métriques Prometheus ci-dessus, disponibilité visuelle en un coup d'œil | `https://grafana.projet-cityspot.fr` |
| Sentry (`@sentry/react`) | Application (frontend) | Tracking des erreurs JS en production | SaaS, dashboard sentry.io |
| `logSecurityEvent` + tag Sentry `security_event:true` | Sécurité applicative | Alerte sur volume anormal de refus d'autorisation (garde de route, RLS) — détail `SECURITE.md` A09 | Règle d'alerte Sentry configurée le 2026-07-19 |
| `fail2ban` | Sécurité infra | Anti brute-force SSH sur l'hôte | `fail2ban-client status sshd` sur le VPS |

**Critères de qualité et de performance** associés à cette supervision : `MANUEL_DEPLOIEMENT.md` §9.

**Disponibilité** : `traefik` assure le renouvellement automatique du certificat TLS et le routage ; un redéploiement (§8.3 de `MANUEL_DEPLOIEMENT.md`) ne remplace que le conteneur `app`, jamais `traefik`, donc pas de coupure TLS à chaque mise à jour applicative.

**Preuve** : `prometheus.yml`, `grafana/provisioning/datasources/prometheus.yml`, `MANUEL_DEPLOIEMENT.md` §8.4, `SECURITE.md` §4 (règle d'alerte Sentry).

**Écart assumé** : les métriques Prometheus/Grafana (infra) sont consultées manuellement (dashboard), aucun Alertmanager configuré dessus — seule la couche sécurité applicative (Sentry) a une alerte automatique active. Cf. §7.

## 4. C4.2.1 — Consignation des anomalies

Critère : *« Le processus de collecte est structuré et adapté à la typologie du logiciel, la fiche de consignation contient les informations permettant de reproduire le bogue »*.

**Processus de collecte** : trois sources de détection, toutes recensées dans `PLAN_CORRECTION_BOGUES.md` §2 (légende) — revue de code, remontée utilisateur, et détection par l'outillage de supervision lui-même (Sentry, cf. §3 ci-dessus). Chaque bogue est qualifié par sévérité (Critique/Majeur/Mineur) selon son impact sécurité ou fonctionnel.

**Fiche de consignation type** (`PLAN_CORRECTION_BOGUES.md`, une entrée par bogue) — exemple BUG-15, seule entrée détectée directement par la supervision plutôt que par revue de code ou remontée utilisateur :

> **BUG-15 — Faux positifs Sentry : `AuthSessionMissingError` à chaque visite anonyme de `/login`**
> Détecté par : alerte Sentry (bruit constant sur une erreur non exploitable) · Cause racine : `getCurrentUser()` levait systématiquement l'exception dès qu'aucune session n'existait, y compris pour un visiteur anonyme légitime sur `/login` · Correctif : l'absence de session y est désormais traitée comme un cas normal, sans remonter d'erreur.

Chaque fiche contient : sévérité, méthode de détection, cause racine, correctif, vérification — assez d'information pour reproduire le bogue sans accès à son auteur.

**Preuve** : `PLAN_CORRECTION_BOGUES.md` (18 entrées).

## 5. C4.2.2 — Créer et déployer un correctif via le processus CI/CD

Critère : *« Le traitement de l'anomalie tire profit du processus d'intégration et de déploiement continu, le correctif mis en place est décrit et permet la résolution de l'anomalie »*.

Exemple concret — **BUG-17/BUG-18** (redirection silencieuse après inscription, coordonnées de ville jamais enregistrées), corrigés et livrés en production dans la même version :

1. Bogues qualifiés et correctifs écrits (`PLAN_CORRECTION_BOGUES.md`, BUG-17/BUG-18).
2. Pull request vers `main` : `.github/workflows/ci.yml` exécute `npm audit`, `typecheck`, `lint`, `test:coverage`, `build` — la fusion est bloquée si l'un échoue.
3. Fusion sur `main`, tag `v1.3.0` posé et poussé (`git tag -a v1.3.0 -m "..." && git push origin v1.3.0`).
4. Le tag déclenche `.github/workflows/deploy.yml` : build de l'image, publication sur GHCR, puis SSH vers le VPS (`docker compose pull && docker compose up -d`) — seul le conteneur `app` est remplacé.
5. Correctif documenté dans `CHANGELOG.md` (entrée v1.3.0) avec numéro de version affiché dans l'application (`VITE_APP_VERSION`, injecté au build depuis le tag).

**Preuve** : `.github/workflows/ci.yml`, `.github/workflows/deploy.yml`, `docs/CHANGELOG.md` (v1.3.0), `MANUEL_MISE_A_JOUR.md` §4.

## 6. C4.3.1 — Recommandations d'amélioration

Critère : *« Les recommandations d'amélioration sont argumentées et permettent d'évaluer les gains de performance en termes de coût, délai de mise en œuvre, etc., sont réalistes et réalisables, et permettent de renforcer l'attractivité du logiciel »*.

Quatre axes, chacun mesuré sur l'état réel du projet (build, couverture, CI) plutôt qu'estimé à vue :

| # | Constat mesuré | Recommandation | Coût / délai | Gain attendu |
|---|---|---|---|---|
| 1 | Le build de production charge `vendor-map` en un seul chunk de **1 048,59 kB** (282,04 kB gzip) — MapLibre GL, chargé même sur les pages qui n'affichent pas de carte (`Profile`, `Settings`) — Vite avertit explicitement au build (*"Some chunks are larger than 500 kB"*). | Charger `MapView` et MapLibre via `React.lazy()` + `import()` dynamique plutôt qu'un import statique en tête de `App.tsx`/`routes.ts`. | Faible : pas de nouvelle dépendance, un changement d'import + un `<Suspense>` dans `routes.ts`. ~0,5 jour. | Le chunk principal (`index-*.js`, 364 kB) ne charge plus MapLibre pour les routes sans carte — premier affichage plus rapide sur `/profile`, `/settings`, `/login`, directement mesurable via Lighthouse (TTI). |
| 2 | Couverture de tests la plus faible du projet : `src/services` à **64,87 %** de lignes (`issuesService.ts` à 60,03 %, cf. `TESTS.md`), contre 81 % pour l'ensemble — concentré sur les branches d'erreur Supabase (réseau, RLS refusée) peu exercées par les tests actuels. | Ajouter des cas de test ciblés sur les branches d'erreur non couvertes de `issuesService.ts` (réponses Supabase en erreur, RLS refusée), en réutilisant les mêmes mocks que les tests existants. | Faible : pas d'outillage nouveau, extension de fichiers de test existants. ~1 jour. | Réduit le risque de régression silencieuse sur le chemin le plus sensible (accès aux données) ; fait progresser un indicateur déjà cité comme critère d'évaluation (C2.2.2). |
| 3 | La supervision infra (Prometheus/Grafana, cf. `MAINTENANCE.md` §3) est consultée manuellement — aucune alerte automatique si le VPS sature (CPU/RAM/disque), contrairement à la couche sécurité applicative qui a une alerte Sentry active. | Ajouter un conteneur `alertmanager` au `docker-compose.yml`, avec 2-3 règles simples sur `node-exporter` (RAM > 90 %, disque > 85 %), notifiant par email ou webhook. | Modéré : un conteneur de plus + fichier de règles YAML, pas de changement d'architecture. ~1-2 jours, à tester sur le VPS réel avant bascule définitive. | Détection proactive d'une dégradation infra avant qu'elle ne devienne une panne visible côté utilisateur — ferme l'écart documenté en `MAINTENANCE.md` §7 sur ce point précis. |
| 4 | `eslint-plugin-jsx-a11y@6.10.2` limite son `peerDependencies` à `eslint@^9`, ce qui bloque la mise à jour d'`eslint` vers la v10 (cf. incident du 2026-07-29, `MAINTENANCE.md` §2) et laisse un résidu `npm audit` non fermable côté outillage. | Surveiller la prochaine release d'`eslint-plugin-jsx-a11y` (suivi manuel, `npm outdated`, cf. C4.1.1) et monter `eslint` dès qu'elle étend son support à `eslint@^10`. | Nul aujourd'hui (juste une veille), quelques heures le jour où la mise à jour devient possible. | Ferme définitivement le résidu `brace-expansion`, sans avoir à choisir entre un `eslint` obsolète et un plugin d'accessibilité cassé. |

**Réalisme** : les quatre recommandations s'appuient sur des mesures déjà produites par l'outillage existant (`vite build`, `npm run test:coverage`, `npm audit`) — aucune n'introduit de nouvelle dépendance lourde ni de changement d'architecture ; elles complètent des écarts déjà nommés explicitement ailleurs dans la documentation (`§2`, `§3`, `TESTS.md`) plutôt que d'en inventer de nouveaux.

## 7. Écarts connus

- **C4.1.1** : pas de veille automatique des nouvelles versions (Dependabot/Renovate) — seule la détection de vulnérabilités est automatisée (`npm audit` en CI), la mise à jour elle-même reste déclenchée manuellement.
- **C4.1.1 (résiduel, 2026-07-29)** : `brace-expansion` (transitif, via `minimatch@3.1.5` interne à `eslint`/`eslint-plugin-jsx-a11y`) reste sur une version signalée par `npm audit`, sans correctif non cassant disponible tant qu'`eslint-plugin-jsx-a11y` ne supporte pas `eslint@10`. Gate CI restreint à `--omit=dev` en conséquence — 0 vulnérabilité sur les dépendances de production. À revoir quand `eslint-plugin-jsx-a11y` étendra son `peerDependencies` à `eslint@^10`.
- **C4.1.2** : pas d'alerte automatique sur les métriques Prometheus/Grafana (infra) — revue manuelle des dashboards ; seule la couche sécurité applicative a une alerte automatique active (Sentry, cf. `SECURITE.md` §4).

Aucun de ces écarts ne bloque le critère — ce sont des marges de progression documentées, dans le même esprit que `SECURITE.md`/`ACCESSIBILITE.md` : limites écrites explicitement plutôt que masquées.
