# Changelog — City Spot

## 1. Objet du document

Ce document trace les évolutions du prototype, version par version, chacune correspondant à un tag Git annoté (`git tag`). Il répond au critère C2.2.4 de la grille d'évaluation :
- *« Un système de gestion de versions est utilisé »* — Git, historique complet sur `main` (`git log`).
- *« Les évolutions du prototype sont tracées »* — ce fichier, plus les tags ci-dessous.

Convention de version : [SemVer](https://semver.org/lang/fr/) (`MAJOR.MINOR.PATCH`). `MAJOR` passe à 1 à la première version considérée production-ready (recette exécutée, bogues bloquants corrigés, documentation complète).

## 2. Versions

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
