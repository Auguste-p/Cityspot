# Changelog — City Spot

## 1. Objet du document

Ce document trace les évolutions du prototype, version par version, chacune correspondant à un tag Git annoté (`git tag`). Il répond au critère C2.2.4 de la grille d'évaluation :
- *« Un système de gestion de versions est utilisé »* — Git, historique complet sur `main` (`git log`).
- *« Les évolutions du prototype sont tracées »* — ce fichier, plus les tags ci-dessous.

Convention de version : [SemVer](https://semver.org/lang/fr/) (`MAJOR.MINOR.PATCH`). `MAJOR` passe à 1 à la première version considérée production-ready (recette exécutée, bogues bloquants corrigés, documentation complète).

## 2. Versions

### v2.2.0 — 2026-09-02 — Profils publics, catégorisation obligatoire, photos en Storage

- **Profils publics** (`58e30dd`, `ed9ddf9`) : nouvelle page `/user/:id` (`PublicProfile.tsx`), accessible en cliquant sur le nom d'un auteur de commentaire (`PostDetail.tsx`, via `Link`) ou depuis son propre profil ("Voir mon profil public", visible seulement si activé). Le rendu (en-tête, badges, onglets Tous/En vote/En cours/Terminés/Votés) est mutualisé dans un nouveau composant `ProfileView.tsx`, partagé entre `Profile.tsx` (son propre profil, données via le contexte auth) et `PublicProfile.tsx` (profil d'un tiers, données via la nouvelle vue publique) — seul le bouton "Paramètres" est conditionnel (`onSettingsClick?`), absent en lecture seule.
  - Nouvelle vue Postgres `public.public_profiles` (migration `20260902110000_add_public_profiles_view.sql`) : `public.users` interdit la lecture de la ligne d'un autre utilisateur (RLS "own row only", SEC-11) — impossible de relire `name`/`avatar`/`city` d'un tiers depuis le client. La vue expose volontairement un sous-ensemble sûr (jamais `phone`/`address`), filtré sur `"profileVisible" = true`, `grant select ... to authenticated, anon`.
  - **Confidentialité activable/désactivable** (`ed9ddf9`) : le switch "Visibilité du profil" (`Settings.tsx`) contrôle désormais réellement l'accès (auparavant sans effet visible) — un profil non rendu public répond "Ce profil est privé" sur `/user/:id` (`PublicProfile.tsx` traite l'absence de ligne renvoyée par la vue, `.maybeSingle()` → `null`, sans distinguer "compte inexistant" de "profil privé", pour ne rien laisser déduire à l'appelant).
- **Nom de l'auteur sur les commentaires** (`93a912b`) : `comments.author_name` (migration `20260902090000_add_comments_author_name.sql`, backfillée depuis `public.users.name` pour les lignes existantes) — même contrainte RLS que ci-dessus empêchant de relire le nom d'un autre auteur à l'affichage, donc dénormalisation à l'écriture (`createComment(issueId, userId, text, authorName)`), au même titre que `issues.owner_email`. `PostDetail.tsx` affiche désormais le vrai nom de chaque auteur (au lieu du seul libellé générique "Citoyen") avec un lien vers son profil public, et " (vous)" pour ses propres commentaires.
  - Au passage, `UserContext.tsx` lit désormais `name` (puis `avatar`, cf. plus bas) depuis `public.users` plutôt que le seul `user_metadata` de Supabase Auth — `user_metadata` n'est écrit qu'à l'inscription et jamais resynchronisé, donc tout compte ayant changé son nom depuis Paramètres affichait encore l'email en son lieu (même classe de bug que celui déjà corrigé pour `city`/`cityLat`/`cityLng` en v1.3.0).
- **Photos en Supabase Storage** (`87cabac`) : les photos de signalement et avatars, jusqu'ici encodées en base64 directement dans les colonnes (`issues.image_url`, taille non bornée en base), sont uploadées vers deux nouveaux buckets publics (migration `20260902100000_add_storage_buckets.sql`) — `issue-photos` et `avatars`, chemin `{auth.uid()}/{timestamp}.{ext}`, policies RLS sur `storage.objects` vérifiant que le premier segment du chemin est bien l'appelant (lecture publique, écriture/suppression réservées au propriétaire). Nouveau module `src/lib/storage.ts` (`uploadToBucket`, `isAllowedImageFile`, `getDefaultIssuePhotoUrl` — l'image par défaut d'un signalement sans photo est désormais servie depuis le bucket plutôt qu'une URL de démo en dur, l'URL du projet Supabase variant selon l'environnement). `Settings.tsx` permet de changer sa photo de profil (`<input type="file">` déclenché par le bouton "Changer la photo", jusque-là sans effet), affichée avec repli sur l'initiale du nom en l'absence d'avatar.
- **Catégorie obligatoire, ville dérivée de l'adresse** (`87cabac`, `7d80269`, `b052f17`) : le sélecteur de catégorie (jusqu'ici masqué en mode édition) est désormais visible et **obligatoire** à la création comme à la modification, au même titre que le titre, la description et la localisation (`createPostSchema` — validation Zod par `.refine`, marquage visuel `*`/`aria-required` sur les 4 champs). `issues.city` est renseignée automatiquement à partir de la ville retournée par Photon lors du géocodage de l'adresse choisie (`GeocodeResult.city`, sans appel réseau supplémentaire), avec repli sur la ville du profil si le géocodage n'en résout aucune (lieu-dit, hors commune) — utilisée par le filtre municipal introduit en v2.1.1.
- **Onglet "Votés" sur le profil** (`edc14a3`) : nouveau hook `useUserVotes(userId)` (`useIssues.ts`) et fonction `listVotesByUser` (`issuesService.ts`), affichant sur `/profile` (et désormais `/user/:id`) les signalements pour lesquels l'utilisateur a voté, en plus de ceux qu'il a créés.
- **Recherche d'adresse et ville dans les Paramètres** (`7415ec1`) : le champ Adresse de `/settings` propose désormais les mêmes suggestions Photon (debounce 400 ms) qu'en création de signalement, avec un nouveau champ Ville en lecture seule, déduit automatiquement de l'adresse choisie et persisté avec `cityLat`/`cityLng` (mis à jour uniquement si l'adresse a été rechangée cette session, pour ne pas désynchroniser des coordonnées existantes déjà cohérentes).
- **Votes négatifs affichés sur la carte** (`d8656d3`) : `MapView.tsx` affichait déjà le compte de votes positifs par signalement dans le panneau latéral ; le compte négatif (`post.votes.negative`) apparaît maintenant à côté, comme c'était déjà le cas sur `PostDetail.tsx`.
- Deux ajustements mineurs à la marge de ce lot : déplacement de l'affichage du numéro de version (`VITE_APP_VERSION`) du bas de la barre de navigation vers `/settings` (`7d80269`), et correction d'une mention trompeuse sur `/post/:id` — "Les tâches seront visibles et modifiables..." devient "...seront modifiables..." (les tâches sont déjà visibles avant le seuil de vote, seule leur édition est bloquée, `05abc7e`).
- Tests : `formSchemas.test.ts` (+1, catégorie requise), `CreatePost.test.tsx`, `Profile.test.tsx`, `issuesService.test.ts`, `geocode.test.ts` mis à jour en cohérence avec ce qui précède — détail par fichier dans `TESTS.md` (chiffres globaux du document non re-mesurés depuis le 2026-07-19, à rafraîchir avec `npm run test:coverage`).
- Documentation mise à jour : `ARCHITECTURE.md` §4 (vue publique, buckets Storage, dénormalisation `author_name`), `MANUEL_UTILISATION.md` §4/§7/§8, `CAHIER_DE_RECETTES.md` (nouveaux scénarios profil public, confidentialité, champs obligatoires — non encore rejoués manuellement, marqués ☐).

### v2.1.1 — 2026-09-02 — Correctif filtre municipal par ville + classes CSS manquantes

- **Vue municipale filtrée par ville de l'agent** (`8ad2ccf`, amende `fb995c8`) : `MunicipalView.tsx` affichait jusqu'ici les signalements de toutes les villes confondues plutôt que ceux de la commune de l'agent connecté. `useIssues(city?)` accepte désormais un filtre optionnel (`listIssues(city)` → `.eq('city', city)` côté Postgres), appelé avec `getCityName(user?.city)` — nouvelle fonction `src/lib/geocode.ts` qui extrait le nom de ville du label complet stocké au profil ("Montpellier, Occitanie" → "Montpellier"). Réutilisée aussi dans `MapView.tsx`/`PostCard.tsx` pour l'affichage de la ville d'un signalement (remplace un découpage fragile `address.split(',')[0]`, qui prenait le premier segment de l'adresse — souvent un numéro de rue — plutôt que la ville).
- **Classes Tailwind manquantes cassant le scroll et le retour à la ligne** (`8ad2ccf`) : `.h-screen`, `.min-h-0` et `.flex-wrap` étaient utilisées dans le JSX mais absentes de l'export CSS statique du projet (pas de build Tailwind actif, cf. `MANUEL_DEPLOIEMENT.md`), donc sans aucun effet — cassait le scroll sur l'ensemble des pages et faisait déborder les boutons de catégorie en création de signalement. `Layout.tsx` : `<main>` passe de `overflow-hidden` à `overflow-y-auto`, nécessaire une fois `h-screen`/`min-h-0` réellement actifs pour que les pages comptant sur le scroll du conteneur (`min-h-full`) ne se retrouvent pas coupées.
- Couleur des chiffres de statistiques de `MunicipalView.tsx` passée à `text-primary-foreground` (héritait `text-card-foreground` de `Card`, illisible sur le fond dégradé).
- Impact recette : `MUN-03` (`CAHIER_DE_RECETTES.md`) à rejouer avec le nouveau filtre par ville.

### v2.1.0 — 2026-08-11 — Alerte automatique sur indisponibilité (Alertmanager)

- **`alertmanager/alertmanager.yml`**, **`alerting_rules.yml`** : nouveau conteneur `alertmanager` dans `docker-compose.yml`, notifiant par email dès qu'une cible Prometheus passe à `up == 0` pendant 2 minutes (`InstanceDown`), ou que la RAM/le disque du VPS dépassent 90 %/85 % pendant 5 minutes. Fermait l'écart documenté en C4.1.2 (supervision consultée manuellement, sans alerte automatique côté infra).
- Mot de passe SMTP jamais commité : `smtp_auth_password_file` pointe vers un secret Docker Compose (`/opt/cityspot/secrets/smtp_password` sur le VPS, même traitement que `.env`).
- **`.github/workflows/deploy.yml`** : ajout d'une étape `appleboy/scp-action` qui synchronise `docker-compose.yml`, `prometheus.yml`, `alerting_rules.yml` et `alertmanager/` vers le VPS avant chaque redémarrage — ces fichiers d'infra ne faisaient jusqu'ici l'objet que d'une copie manuelle, jamais automatisée par la CD.
- Documentation mise à jour : `MAINTENANCE.md` §3/§6/§8, `DOSSIER_MAINTENANCE.md` §2/§5/§6, `MANUEL_DEPLOIEMENT.md` §8, `GRILLE_EVALUATION.md`, `DOSSIER_CERTIFICATION.md` (diagramme d'architecture).

### v2.0.3 — 2026-08-10 — Correctif performance : MapLibre GL chargé sur toutes les routes malgré le découpage par route

- **`vite.config.ts`** : `manualChunks` forçait `maplibre-gl` dans un chunk nommé `vendor-map` (1 048,59 kB / 282,04 kB gzip). Rollup traite un chunk manuellement nommé comme partagé et ajoutait un `import` **statique** vers lui dans toutes les autres routes (`LoginPage`, `Profile`, `Settings`, `CreatePost`, `PostDetail`, `MunicipalView`), malgré le découpage par route déjà en place dans `routes.ts` (`import()` dynamique par page) — le chunk et son CSS (69,92 kB) se chargeaient donc même sur les pages sans carte. Retrait du regroupement forcé : Rollup garde désormais MapLibre privé au chunk `MapView`, seule route qui l'importe réellement.
- Vérifié par build + capture réseau (`vite build` puis `vite preview`) : `index-*.js` reste à 364 kB, plus aucune requête vers `vendor-map-*` sur `/login`, `/profile`, `/settings`.
- Documentation mise à jour : `MAINTENANCE.md` §6 (recommandation retirée du tableau, appliquée)

### v2.0.2 — 2026-07-29 — Correctif RLS à la création d'un signalement

- **`CreatePost.tsx`** : la création d'un signalement pouvait échouer avec une violation de la policy RLS Postgres (`new row violates row-level security policy for table "issues"`) si le formulaire était soumis avant la résolution asynchrone de la session (`UserContext`) — `created_by: user?.id` valait alors `undefined`, silencieusement omis du payload JSON envoyé à PostgREST, donc `NULL` en base, ce que la policy `with check (auth.uid() = created_by)` refuse. `onSubmit` bloque désormais tant que `user` n'est pas chargé, avec un message clair au lieu de l'erreur RLS brute.

### v2.0.1 — 2026-07-29 — Correctif CI : échec `npm audit`

- **`postcss`, `react-router`** : montée de version non cassante (`npm audit fix`) — corrige 2 vulnérabilités hautes (path traversal sur les source maps, contournement CSRF en mode RSC) sur des dépendances de production.
- **`.github/workflows/ci.yml`** : le gate `npm audit` passe à `--omit=dev` (dépendances de production uniquement). Le résidu restant (`brace-expansion`, via `minimatch@3.1.5` imbriqué dans les dépendances propres d'`eslint`/`eslint-plugin-jsx-a11y`) n'a pas de correctif non cassant tant qu'`eslint-plugin-jsx-a11y` ne supporte pas `eslint@10` en peer dependency — bogue d'outillage lint, jamais exécuté en production. Détail : `MAINTENANCE.md` §2 et §8.

### v2.0.0 — 2026-07-29 — Documentation de maintenance en condition opérationnelle (BLOC 4)

- **`docs/MAINTENANCE.md`** : nouveau document répondant aux critères C4.1.1 (processus de mise à jour des dépendances), C4.1.2 (système de supervision et d'alerte), C4.2.1 (consignation des anomalies) et C4.2.2 (correctif créé et déployé via le processus CI/CD) — s'appuie sur l'existant (`ci.yml`, `prometheus.yml`, `grafana/`, `SECURITE.md`, `PLAN_CORRECTION_BOGUES.md`) sans dupliquer, en documentant explicitement ce qui manquait comme livrable autonome pour ces critères.
- `GRILLE_EVALUATION.md` étendu au bloc **C4** (au-delà du seul C2 couvert jusqu'ici).
- Passage en version majeure 2.x pour marquer le passage du BLOC 2 (Concevoir et développer) au BLOC 4 (Maintenir en condition opérationnelle) de la grille d'évaluation.

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
