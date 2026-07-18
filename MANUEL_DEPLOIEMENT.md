# Manuel de déploiement — City Spot

## 1. Objet du document

Ce document décrit l'environnement de développement, le protocole de déploiement continu et les critères de qualité/performance de City Spot, ainsi que la construction et le lancement du conteneur Docker en production (nginx). Il répond aux critères C2.1.1, C2.1.2 et C2.4.1 (volet *« manuel de déploiement »*) de la grille d'évaluation.

Pour l'historique des versions et la procédure de mise à jour d'une instance déjà déployée, voir [`MANUEL_MISE_A_JOUR.md`](./MANUEL_MISE_A_JOUR.md). Pour la prise en main de l'application par un utilisateur final, voir [`MANUEL_UTILISATION.md`](./MANUEL_UTILISATION.md).

## 2. Environnement de développement

| Élément | Choix |
|---|---|
| Éditeur de code | Visual Studio Code — extension recommandée `denoland.vscode-deno` pour la fonction Edge (`.vscode/extensions.json`, `.vscode/settings.json`) |
| Langage | TypeScript |
| Compilateur / transpileur | SWC (`@vitejs/plugin-react-swc`), intégré au bundler Vite |
| Bundler / serveur de dev | Vite 6 (`npm run dev`, port 5173 par défaut) |
| Runtime | Node.js 22 (aligné entre `.github/workflows/ci.yml` et l'image `node:22-alpine` du `Dockerfile`) |
| Gestionnaire de paquets | npm |
| Gestion de sources | Git, dépôt distant GitHub (`Auguste-p/Cityspot`) |
| Tests | Vitest + Testing Library + axe-core |

> ⚠️ **Limite assumée** : il n'y a pas de `tsconfig.json` dédié ni de script `typecheck`/`lint` dans `package.json` à ce jour. SWC transpile le TypeScript sans vérifier les types (il ignore les erreurs de typage, contrairement à `tsc`). Le typage n'est donc pas vérifié automatiquement en CI — seule une exécution manuelle ponctuelle de `tsc` a eu lieu pendant le développement (cf. `README.md`, journal IA). Ajouter un `tsconfig.json` + une étape `tsc --noEmit` en CI est l'amélioration la plus directe si ce point doit être fermé avant l'oral.

## 3. Composants identifiés

| Composant du critère | Outil utilisé dans City Spot |
|---|---|
| Compilateur | SWC (via `@vitejs/plugin-react-swc`), orchestré par Vite |
| Serveur d'application (production) | nginx (`nginx.conf`), image `nginx:alpine-slim` |
| Serveur d'application (développement) | Vite dev server |
| Outils de gestion de sources | Git + GitHub, tags SemVer (`CHANGELOG.md`) pour le suivi de version |
| Gestionnaire de dépendances | npm |
| Backend / base de données | Supabase (Postgres managé, Auth, Edge Functions Deno) |
| Conteneurisation | Docker (multi-stage build, cf. §5) |

## 4. Prérequis

- Docker avec BuildKit (par défaut sur Docker récent / OrbStack).
- Un fichier `.env` à la racine avec `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` (voir `README.md`).

## 5. Build de l'image

Les clés Supabase sont nécessaires **au build** (Vite les intègre dans le bundle JS, pas au runtime). Elles sont passées via `--secret`, jamais en `--build-arg` ni en clair dans la commande — elles n'apparaissent donc ni dans l'historique du shell ni dans `docker history`.

```bash
set -a; source .env; set +a

docker build \
  --secret id=VITE_SUPABASE_URL,env=VITE_SUPABASE_URL \
  --secret id=VITE_SUPABASE_ANON_KEY,env=VITE_SUPABASE_ANON_KEY \
  -t cityspot .
```

## 6. Lancer le conteneur (local)

```bash
docker run -d --name cityspot -p 8080:80 cityspot
```

L'app est servie par nginx sur `http://localhost:8080`. Le routing côté client (react-router) fonctionne grâce au fallback SPA défini dans `nginx.conf`.

```bash
docker rm -f cityspot   # arrêter / nettoyer
```

## 7. Pipeline d'intégration continue (GitHub Actions)

Chaque push ou pull request vers `main` déclenche `.github/workflows/ci.yml` : installation des dépendances, exécution de la suite de tests avec couverture (`npm run test:coverage`), build de production (`npm run build`), puis dépôt du rapport de couverture en artefact CI (`coverage-report`, 30 jours de rétention). Un test ou un build en échec bloque la fusion.

Ce pipeline couvre l'intégration continue (test + build) mais ne publie pas l'image Docker — c'est le rôle du pipeline de déploiement continu (§8).

## 8. Déploiement continu (GitHub Actions → GHCR → VPS)

`.github/workflows/deploy.yml` se déclenche sur le push d'un tag `vX.Y.Z` (les mêmes tags que `CHANGELOG.md`, cf. `MANUEL_MISE_A_JOUR.md` §4) et enchaîne deux jobs :

1. **`build-and-push`** — build l'image Docker (mêmes secrets `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` qu'en local, §5) et la pousse sur le **GitHub Container Registry** (`ghcr.io/auguste-p/cityspot`), taguée à la fois `latest` et avec le numéro de version (`vX.Y.Z`). Authentification via `GITHUB_TOKEN`, généré automatiquement par GitHub Actions — aucun compte ni secret de registre à créer séparément.
2. **`deploy`** — se connecte en SSH au VPS et relance les conteneurs (`docker compose pull && docker compose up -d`) dans `/opt/cityspot`.

**Sur le VPS**, plusieurs conteneurs tournent en permanence via `docker-compose.yml` (fichier à la racine du repo, à copier sur le VPS) :

- `app` — l'image `cityspot` construite ci-dessus, écoute en HTTP nu en interne (nginx, §6) sans port publié directement.
- `traefik` — reverse proxy public sur les ports 80/443, découvre les services à router via les labels Docker de chaque conteneur (pas de fichier de config central à éditer par domaine), obtient et renouvelle automatiquement un certificat Let's Encrypt par domaine routé.
- `prometheus` / `node-exporter` / `cadvisor` / `grafana` — supervision infra (§8.4).
- `matomo` / `matomo-db` — analytics web auto-hébergées (§8.4).

⚠️ **Historique** : la v1.0.1 utilisait Caddy (`Caddyfile`, config statique par domaine). Passage à Traefik en v1.1.0 pour router plusieurs sous-domaines (monitoring, analytics) via labels Docker sans fichier central à maintenir à chaque ajout de service — voir `CHANGELOG.md`.

### 8.1 Secrets GitHub requis

| Secret | Rôle |
|---|---|
| `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` | Déjà utilisés pour le build (§5) |
| `VPS_HOST` | IP ou nom d'hôte du VPS OVH |
| `VPS_USER` | Utilisateur SSH sur le VPS |
| `VPS_SSH_KEY` | Clé privée SSH (le VPS doit avoir la clé publique correspondante dans `~/.ssh/authorized_keys`) |

`GITHUB_TOKEN` (accès GHCR) est fourni automatiquement par GitHub Actions, pas besoin de le créer.

### 8.2 Mise en place initiale du VPS (une seule fois)

VPS OVH commandé : Debian, domaine `projet-cityspot.fr`.

1. Debian — Docker Engine + plugin `docker compose` installés.
2. Créer `/opt/cityspot/`, y copier `docker-compose.yml`, `prometheus.yml` et le dossier `grafana/provisioning/`.
3. Enregistrements DNS A vers l'IP du VPS pour `projet-cityspot.fr`, `grafana.projet-cityspot.fr`, `matomo.projet-cityspot.fr`.
4. Rendre le package `ghcr.io/auguste-p/cityspot` public dans les paramètres GitHub (Packages) pour que `docker compose pull` fonctionne sur le VPS sans authentification — sinon, faire un `docker login ghcr.io` une fois sur le VPS avec un token en lecture seule.
5. Ajouter la clé publique SSH correspondant à `VPS_SSH_KEY` dans `~/.ssh/authorized_keys` sur le VPS.
6. Créer `/opt/cityspot/.env` (non versionné) avec `GRAFANA_ADMIN_PASSWORD`, `MATOMO_DB_PASSWORD`, `MATOMO_DB_ROOT_PASSWORD` — valeurs générées (`openssl rand -base64 18`), jamais commitées.
7. `cd /opt/cityspot && docker compose up -d` une première fois manuellement pour vérifier que tout démarre, avant de laisser `deploy.yml` s'en charger.

### 8.3 Séquence de déploiement (une fois l'installation initiale faite)

1. Recette validée (`CAHIER_DE_RECETTES.md`), tag `vX.Y.Z` posé et poussé sur `main` (`CHANGELOG.md`).
2. `deploy.yml` construit l'image, la pousse sur GHCR.
3. `deploy.yml` se connecte en SSH au VPS, tire la nouvelle image et relance les conteneurs — seul le conteneur `app` est remplacé, `traefik` n'est pas interrompu (pas de coupure TLS).
4. Vérification post-déploiement : accès HTTPS au domaine, `docker compose logs app` sans erreur.

### 8.4 Supervision, analytics et erreurs applicatives

Ferme le point ouvert §10.4/A09 (aucune supervision en prod) de la session précédente.

| Service | Rôle | Accès |
|---|---|---|
| `prometheus` + `node-exporter` + `cadvisor` | Collecte métriques hôte (CPU/RAM/disque) et conteneurs Docker | Interne uniquement, pas de routeur Traefik — accès via `docker exec` ou en ajoutant temporairement un label si besoin de debug |
| `grafana` | Dashboards sur les métriques Prometheus (datasource pré-provisionnée, `grafana/provisioning/datasources/prometheus.yml`) | `https://grafana.projet-cityspot.fr`, identifiants dans `/opt/cityspot/.env` |
| `matomo` + `matomo-db` | Analytics web auto-hébergées (alternative à Google Analytics, aucune donnée envoyée à un tiers) | `https://matomo.projet-cityspot.fr`, assistant d'installation web au premier accès |
| Sentry (SaaS, pas de conteneur) | Tracking d'erreurs frontend (`@sentry/react`, `src/lib/sentry.ts`) | Compte gratuit sentry.io — DSN passé en variable de build `VITE_SENTRY_DSN` (secret GitHub), pas un secret sensible (conçu pour être public côté client) |
| `fail2ban` | Anti brute-force SSH, installé directement sur l'hôte Debian (apt, hors Docker — a besoin d'un accès direct à `iptables` et aux logs système) | `sudo fail2ban-client status sshd` sur le VPS |

⚠️ **Limite assumée** : self-hébergement de Sentry écarté volontairement — le stack officiel `getsentry/self-hosted` recommande 16 Go RAM, hors de portée du VPS (4 Go). Le tier gratuit SaaS (5k erreurs/mois) est largement suffisant pour ce volume de trafic.

## 9. Critères de qualité et de performance

| Axe | Critère | Mesure actuelle | Outil |
|---|---|---|---|
| Qualité — tests | Couverture de lignes ≥ 80 % | 81,27 % (`src` global) | Vitest + `@vitest/coverage-v8`, détail dans `TESTS.md` |
| Qualité — build | Le build de production doit réussir sans erreur | ✅ vérifié à chaque push/PR | `npm run build` en CI |
| Qualité — non-régression | La suite de tests doit être verte avant toute fusion sur `main` | ✅ appliqué | `.github/workflows/ci.yml` |
| Qualité — accessibilité | Conformité RGAA 4.1 sur tous les écrans | Détail dans `ACCESSIBILITE.md` | axe-core (Vitest) |
| Qualité — sécurité | Couverture OWASP Top 10 | Détail dans `SECURITE.md` | Revue manuelle + `CAHIER_DE_RECETTES.md` (SEC-01 à SEC-11) |
| Performance — taille du bundle | Limiter le poids du chunk principal | ~270 kB (contre 511 kB avant code-splitting par route) | Optimisation manuelle ponctuelle (`README.md`, journal IA) — **pas de budget chiffré ni d'outil automatisé en CI à ce jour** |

> ⚠️ **Limite assumée** : la mesure de performance (taille de bundle) a été faite une fois, manuellement, pas de façon continue. Aucun outil de type Lighthouse CI ou `bundlesize` n'est branché sur le pipeline. À ajouter si un suivi de performance continu est exigé par le jury.

## 10. À savoir avant un déploiement VPS

`package-lock.json` est dans `.gitignore` — un `git clone` frais n'aura pas ce fichier. Le `Dockerfile` utilise `npm install` (pas `npm ci`) pour cette raison. Committer le lockfile permettrait de repasser sur `npm ci`, plus rapide et déterministe.
