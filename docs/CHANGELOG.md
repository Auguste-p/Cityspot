# Changelog — City Spot

## 1. Objet du document

Ce document trace les évolutions du prototype, version par version, chacune correspondant à un tag Git annoté (`git tag`). Il répond au critère C2.2.4 de la grille d'évaluation :
- *« Un système de gestion de versions est utilisé »* — Git, historique complet sur `main` (`git log`).
- *« Les évolutions du prototype sont tracées »* — ce fichier, plus les tags ci-dessous.

Convention de version : [SemVer](https://semver.org/lang/fr/) (`MAJOR.MINOR.PATCH`). `MAJOR` passe à 1 à la première version considérée production-ready (recette exécutée, bogues bloquants corrigés, documentation complète).

## 2. Versions

### v1.3.0 — 2026-07-20 — Centrage sur la ville, robustesse de l'inscription, vérification des types et du lint

- **Carte centrée sur la ville de l'utilisateur** : `cityLat`/`cityLng`, renseignés à l'inscription (recherche de ville filtrée aux communes, `searchCity()`), centrent désormais la carte à la connexion au lieu de systématiquement retomber sur la ville par défaut.
- **BUG-17** — redirection silencieuse vers `/login` après une inscription réussie (projet Supabase avec confirmation d'email requise, donc pas de session immédiate) : un message clair *"Compte créé ! Vérifiez votre boîte mail..."* remplace la navigation aveugle vers `/`.
- **BUG-18** — `cityLat`/`cityLng` jamais persistés en base dans la plupart des cas (l'update client dépendait d'une session active, absente tant que l'email n'est pas confirmé) : la donnée passe désormais par `user_metadata`, insérée par le trigger `handle_new_user` en une seule fois avec `name`/`city`, indépendamment de toute session.
- **Garde-fou inscription** : nouvelle fonction Postgres `email_exists` (`SECURITY DEFINER`) vérifiant `auth.users` avant `auth.signUp()` — un compte supprimé de `public.users` sans supprimer la ligne `auth.users` correspondante est maintenant détecté avec un message clair plutôt qu'un comportement confus.
- **BUG-16** — carte quasi invisible en layout étroit (mobile et desktop) : cause à trois niveaux (panneau de liste sans contrainte de hauteur, résolution `h-full` peu fiable dans un item flex, classe `maplibregl-map` de la librairie cartographique imposant silencieusement `position: relative`) — détail dans `PLAN_CORRECTION_BOGUES.md`.
- **Vérification des types en CI** : ajout d'un `tsconfig.json` et d'un script `typecheck` (`tsc --noEmit`), rejoué à chaque push/PR avant les tests — SWC (utilisé pour le build) ne vérifiait jamais les types jusqu'ici. A fait remonter et corriger plusieurs incohérences réelles dans le typage manuel de `Database` (`src/lib/supabase.ts`), qui faisaient silencieusement dégénérer certains résultats Supabase en `never`.
- **Lint en CI** : ajout d'ESLint (`eslint.config.js`, flat config — `typescript-eslint`, `eslint-plugin-react-hooks`, `eslint-plugin-jsx-a11y`), script `lint` rejoué à chaque push/PR. A fait remonter un bogue réel dans `MunicipalView.tsx` : les compteurs de catégories (`categoryCounts`) étaient mémoïsés avec un tableau de dépendances vide, donc figés sur les signalements chargés au tout premier rendu (souvent vides, `useIssues()` étant asynchrone) et ne se mettaient jamais à jour ensuite — corrigé en ajoutant `posts` aux dépendances. La règle `react-hooks/set-state-in-effect` (nouvelle, très stricte) a été volontairement abaissée à `warn` : elle flague le pattern *fetch dans `useEffect` + `setState`* utilisé de façon délibérée dans tout le projet, faute de React Query/SWR (choix documenté dans `ARCHITECTURE.md`), et non un vrai bogue.
- Numéro de version affiché en bas de l'application (`VITE_APP_VERSION`, injecté au build depuis le tag Git).
- Dossier de certification consolidé (`DOSSIER_CERTIFICATION.md` + export PDF), regroupant l'ensemble des livrables attendus en un seul document.

### v1.3.1 — 2026-07-20 — Builds reproductibles (lockfile committé)

- **`package-lock.json` committé** (n'est plus dans `.gitignore`) : `Dockerfile` et `.github/workflows/ci.yml` passent de `npm install` à `npm ci`, pour des builds reproductibles à partir des mêmes versions verrouillées (ferme la nuance résiduelle sur A08, cf. `SECURITE.md`).

### v1.2.1 — 2026-07-20 — Correctif d'affichage de la carte sur mobile

- **Carte invisible/écrasée sur mobile et en layout étroit** (`MapView.tsx`) : le conteneur de la carte utilisait `h-full` en cascade sur plusieurs `<div>` imbriqués dans un item flex, une résolution de hauteur en pourcentage qui ne se propageait pas de façon fiable. Remplacé par un positionnement `absolute inset-0` sur le conteneur non touché par MapLibre, et `h-full w-full` sur celui que MapLibre reclasse lui-même (`maplibregl-map`, qui impose `position: relative` et écrasait silencieusement un `position: absolute` posé directement dessus).
- Panneau de liste des signalements (mobile) : passe à `flex-1` pour partager l'espace avec la carte au lieu de la pousser hors de l'écran par sa hauteur de contenu.
- Nouvelle classe CSS écrite à la main (`.cityspot-details-panel`, `src/index.css`) pour contourner l'absence de variantes `lg:flex-none` dans le CSS statique du projet (pas de build Tailwind actif, cf. `MANUEL_DEPLOIEMENT.md`).

### v1.2.0 — 2026-07-20 — Recherche d'adresse précise à la création d'un signalement

- **Recherche d'adresse avec suggestions** (`src/lib/geocode.ts`, `CreatePost.tsx`) : le champ "Localisation" propose désormais une liste de suggestions au fil de la frappe (debounce 400 ms), via l'API Photon (mêmes données OSM que le reverse-geocoding déjà utilisé dans `MapView`, mais pensée pour l'autocomplétion — rues, numéros, lieux nommés, pas seulement des villes). Corrige un bogue réel : tout nouveau signalement était créé avec `lat: 0, lng: 0` (marqueur sur Null Island) ; le marqueur apparaît désormais à la position réelle du lieu choisi. Si aucune suggestion n'est sélectionnée, une géolocalisation de secours du texte saisi est tentée à la soumission avant de retomber sur la ville par défaut.
- **BUG-15** (`PLAN_CORRECTION_BOGUES.md`) : `getCurrentUser()` ne relance plus `AuthSessionMissingError` — un visiteur anonyme sur `/login` ne déclenche plus de faux positif Sentry.
- **Suppression de l'Edge Function `delete-issue`** : devenue redondante depuis que la RLS sur `issues` couvre `DELETE` (BUG-10, même règle `auth.uid() = created_by` que pour `UPDATE`) — la fonction ne faisait plus rien que la base ne fasse déjà nativement. `issuesService.deleteIssue()` appelle désormais directement `.from('issues').delete()` ; l'absence de ligne supprimée (RLS qui filtre) est détectée côté client pour préserver le même message d'erreur qu'avant. Détail : `ARCHITECTURE.md` §4, `GRILLE_EVALUATION.md`.
- Impact recette : SEC-02/SEC-03 (`CAHIER_DE_RECETTES.md`) rejoués contre le nouveau mécanisme par sonde REST directe (2 comptes réels) — confirmés ✅, l'ancienne vérification (HTTP 403/401 explicites de la fonction) ne s'appliquait plus.
- **A09 fermé** : `logSecurityEvent()` (`src/lib/sentry.ts`) envoie un événement Sentry `warning`, tag `security_event:true`, à chaque refus d'autorisation métier — garde de route `/municipal` (`Layout.tsx`), suppression/modification bloquée par la RLS (`issuesService.ts`, `deleteIssue`/`updateIssue`). Complété par une règle d'alerte Sentry sur ce tag et une revue des logs de requêtes Supabase, configurées manuellement (dashboards, hors code) — détail `SECURITE.md` §4.
- **A06 fermé** : `npm audit --audit-level=high` ajouté à `.github/workflows/ci.yml`, rejoué à chaque push/PR vers `main` — le build échoue désormais si une vulnérabilité haute/critique est introduite.

### v1.1.0 — 2026-07-19 — Supervision, analytics et tracking d'erreurs

Remplacement de Caddy par Traefik (routage par labels Docker), ajout d'une stack de supervision et d'analytics auto-hébergées.

- `traefik` remplace `caddy` comme reverse proxy — routage dynamique par labels Docker au lieu d'un fichier de config statique par domaine
- Supervision infra : `prometheus` + `node-exporter` + `cadvisor` + `grafana` (dashboard sur `grafana.projet-cityspot.fr`)
- Analytics auto-hébergées : `matomo` + `matomo-db` (sur `matomo.projet-cityspot.fr`)
- Tracking d'erreurs frontend : `@sentry/react` (SaaS gratuit, pas de conteneur — le self-hosted est hors de portée des ressources du VPS)
- Anti brute-force SSH : `fail2ban` installé sur l'hôte
- Ferme le point A09 (`SECURITE.md`) resté ouvert depuis la v1.0.0

### v1.0.1 — 2026-07-18 — Premier déploiement réel

VPS OVH (Debian) commandé et configuré, nom de domaine `projet-cityspot.fr` lié en DNS. Premier déclenchement réel de `deploy.yml` : build+push GHCR puis déploiement SSH sur le VPS.

- `Caddyfile` : domaine réel `projet-cityspot.fr` (remplace le `[TODO]`)
- Mise en place initiale du VPS (`/opt/cityspot`, Docker, secrets GitHub `VPS_HOST`/`VPS_USER`/`VPS_SSH_KEY`)

### v1.0.0 — 2026-07-17 — Version production-ready

Première version considérée stable et manipulable en autonomie par un utilisateur : recette exécutée (75/87 scénarios ✅, 18/18 Bloquants ✅), les 14 bogues détectés corrigés et re-vérifiés, couverture de tests 81,27 %, accessibilité RGAA 4.1 vérifiée sur tous les écrans, mesures de sécurité mappées à l'OWASP Top 10, documentation complète (déploiement, utilisation, mise à jour, sécurité).

- Édition et suppression de signalement sécurisées (garde de propriété client + serveur)
- Persistance réelle des paramètres utilisateur (`Settings.tsx` connecté à Supabase)
- Statut municipal recentré sur une source de vérité unique (`public.users.role`)
- Row Level Security posée sur `issues`/`tasks`/`materials`/`comments`/`votes`/`users`
- Suite de tests complète (100 tests) incluant la couverture accessibilité RGAA
- Cahier de recettes, plan de correction des bogues, manuels de déploiement/utilisation/mise à jour, mapping OWASP

### v0.5.0 — 2026-07-15 — Intégration continue

- Pipeline CI (GitHub Actions) : install, tests, build à chaque push/PR vers `main`
- Amélioration de l'accessibilité et des fonctionnalités de vote
- Tests du composant `Card`

### v0.4.0 — 2026-07-09 — Conteneurisation

- Configuration Docker (`Dockerfile`) et nginx pour le déploiement de l'application
- Centralisation des textes, URLs et couleurs répétés dans le code

### v0.3.0 — 2026-06-29 — Authentification

- Authentification (connexion/inscription) via Supabase Auth
- Gestion des commentaires et des votes sur un signalement
- Nettoyage des dépendances et refonte du contexte utilisateur

### v0.2.0 — 2026-04-11 — Carte interactive

- Intégration de `maplibre-gl` dans `MapView` avec géolocalisation et marqueurs personnalisés
- Suppression du composant `Chart` inutilisé

### v0.1.0 — 2026-04-10 — Backend réel

- Bascule des données mock vers Supabase (première version connectée à une base réelle)
- États de chargement (spinner) sur les vues asynchrones

---

Historique détaillé, commit par commit : `git log`. Détail des bogues corrigés entre versions : [`PLAN_CORRECTION_BOGUES.md`](./PLAN_CORRECTION_BOGUES.md).
