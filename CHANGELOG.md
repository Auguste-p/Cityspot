# Changelog — City Spot

## 1. Objet du document

Ce document trace les évolutions du prototype, version par version, chacune correspondant à un tag Git annoté (`git tag`). Il répond au critère C2.2.4 de la grille d'évaluation :
- *« Un système de gestion de versions est utilisé »* — Git, historique complet sur `main` (`git log`).
- *« Les évolutions du prototype sont tracées »* — ce fichier, plus les tags ci-dessous.

Convention de version : [SemVer](https://semver.org/lang/fr/) (`MAJOR.MINOR.PATCH`). `MAJOR` passe à 1 à la première version considérée production-ready (recette exécutée, bogues bloquants corrigés, documentation complète).

## 2. Versions

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
