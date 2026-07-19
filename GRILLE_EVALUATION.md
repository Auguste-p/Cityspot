# Traçabilité grille d'évaluation — City Spot

## 1. Objet du document

Ce document est l'index unique qui fait correspondre chaque critère du bloc de compétences **C2** de la grille d'évaluation au(x) document(s) et à la preuve concrète (fichier, section, chiffre, scénario) qui y répond. Il ne remplace aucun document existant — il pointe vers eux.

## 2. Vue d'ensemble

| Critère | Intitulé (résumé) | Document(s) | Statut |
|---|---|---|---|
| C2.1.1 | Environnement de développement identifié | `MANUEL_DEPLOIEMENT.md` §2 | ✅ |
| C2.1.2 | Intégration continue / déploiement continu | `MANUEL_DEPLOIEMENT.md` §3-§8, `TESTS.md` §1 | ✅ |
| C2.2.1 | Architecture présentée | `ARCHITECTURE.md` | ✅ |
| C2.2.2 | Tests unitaires couvrent la majorité du code | `TESTS.md` | ✅ |
| C2.2.3 | Sécurité (OWASP Top 10) + accessibilité (référentiel choisi et justifié) | `SECURITE.md`, `ACCESSIBILITE.md` | ✅ (gaps mineurs assumés) |
| C2.2.4 | Gestion de versions + traçabilité des évolutions | `CHANGELOG.md` | ✅ |
| C2.3.1 | Cahier de recettes couvre les fonctionnalités attendues | `CAHIER_DE_RECETTES.md` | ✅ |
| C2.3.2 | Bogues détectés, qualifiés et traités | `PLAN_CORRECTION_BOGUES.md` | ✅ |
| C2.4.1 | Manuels (déploiement / utilisation / mise à jour) | `MANUEL_DEPLOIEMENT.md`, `MANUEL_UTILISATION.md`, `MANUEL_MISE_A_JOUR.md` | ✅ |

## 3. Détail par critère

### 3.1 C2.1.1 — Environnement de développement
**Document** : `MANUEL_DEPLOIEMENT.md` §2 (tableau éditeur/langage/transpileur/bundler/runtime/gestionnaire de paquets/VCS/tests).
**Statut** : ✅

### 3.2 C2.1.2 — Intégration et déploiement continus
**Document** : `MANUEL_DEPLOIEMENT.md` (pipeline CI `.github/workflows/ci.yml` : tests + build sur chaque push/PR vers `main` ; pipeline CD `.github/workflows/deploy.yml` : build+push GHCR puis déploiement SSH sur le VPS, déclenché par un tag `vX.Y.Z`).
**Preuve** : les deux pipelines ont été **vérifiés en conditions réelles**, pas juste rédigés — déploiement réel sur `v1.0.1` (2026-07-18) et `v1.1.0` (2026-07-19), cf. `CHANGELOG.md`.
**Statut** : ✅ — écart mineur assumé : pas de `tsc --noEmit` ni de lint en CI (SWC transpile sans vérifier les types). `npm audit --audit-level=high` rejoué à chaque push/PR depuis le 2026-07-19 (cf. §4).

### 3.3 C2.2.1 — Architecture présentée
**Document** : `ARCHITECTURE.md` — vue d'ensemble (schéma Mermaid composants/flux), frontend (structure `src/`, routage), backend Supabase (RLS table par table, y compris `DELETE` depuis le retrait de l'Edge Function `delete-issue` — cf. `CHANGELOG.md` v1.2.0), déploiement/infra (Docker, Traefik, supervision, CI/CD), frontières de confiance.
**Statut** : ✅ — closes l'écart précédemment documenté ici (contenu qui existait dispersé entre `README.md`, `MANUEL_DEPLOIEMENT.md` et `SECURITE.md`, désormais consolidé sans duplication : `ARCHITECTURE.md` renvoie vers ces trois documents pour le détail plutôt que de le répéter).

### 3.4 C2.2.2 — Tests unitaires couvrent la majorité du code développé
**Document** : `TESTS.md`, citant explicitement le critère : *« Les tests unitaires couvrent la majorité du code développé »*.
**Preuve** : 105 tests, 80.88 % de couverture des lignes de `src` (mesurée le 2026-07-19), détail fichier par fichier dans `TESTS.md` §4. Rejoué en CI à chaque push (`ci.yml`), artefact `coverage-report` déposé 30 jours.
**Statut** : ✅

### 3.5 C2.2.3 — Sécurité et accessibilité
**Sécurité** — document `SECURITE.md`, citant : *« Les mesures prises permettent de couvrir les 10 failles de sécurité principales décrites par l'OWASP »*. Mapping explicite des 10 catégories OWASP Top 10 2021, chacune reliée à un fichier et à un scénario de recette ou de correction de bogue qui la vérifie.
**Accessibilité** — document `ACCESSIBILITE.md`, citant : *« Le référentiel d'accessibilité choisi est présenté et justifié »* et *« Le prototype permet de répondre aux exigences du référentiel d'accessibilité préalablement établi »*. Référentiel retenu : RGAA 4.1, vérifié via `axe-core` sur tous les écrans (détail des tests dans `TESTS.md` §5).
**Statut** : ✅ — écart mineur assumé et écrit explicitement (contraste RGAA non vérifiable sous `jsdom`). A09 entièrement fermé depuis le 2026-07-19 (télémétrie applicative + alerte Sentry + revue des logs Supabase, cf. `SECURITE.md` §4).

### 3.6 C2.2.4 — Gestion de versions et traçabilité des évolutions
**Document** : `CHANGELOG.md`, citant : *« Un système de gestion de versions est utilisé »* et *« Les évolutions du prototype sont tracées »*.
**Preuve** : SemVer, 7 versions taguées (`v0.1.0` → `v1.1.0`), chaque tag annoté Git correspond à une entrée du changelog.
**Statut** : ✅

### 3.7 C2.3.1 — Le cahier de recettes reprend l'ensemble des fonctionnalités attendues
**Document** : `CAHIER_DE_RECETTES.md` §1.1, qui s'auto-cite au critère avec les deux exigences : *« Le cahier de recettes reprend l'ensemble des fonctionnalités attendues »* et *« Les tests fonctionnels, structurels et de sécurité exécutés sont conformes au plan défini »*.
**Preuve** : 87 scénarios (fonctionnels §5-§11, structurels §12, sécurité §13), 75 ✅ / 0 ❌, les 18 scénarios **Bloquant** tous ✅, 12 non exécutés avec raison documentée sur chaque ligne (cf. `CAHIER_DE_RECETTES.md` §1.1 et le détail par cas dans `CONTEXTE_PROJET.md` §10.1, non versionné).
**Statut** : ✅

### 3.8 C2.3.2 — Les bogues sont détectés, qualifiés et traités
**Document** : `PLAN_CORRECTION_BOGUES.md`, citant les trois exigences du critère : *« Les bogues de codes sont détectés, qualifiés et traités »*, *« Une analyse des points d'amélioration est réalisée pour chaque test en échec »*, *« Les corrections et les améliorations proposées sont conformes à l'attendu et garantissent le bon fonctionnement du logiciel »*.
**Preuve** : 15 bogues recensés, tous ✅ corrigés et re-vérifiés (5 Critiques, 6 Majeurs, 4 Mineurs). Chaque entrée documente la méthode de détection, la cause racine, le correctif et la vérification. **BUG-15** (2026-07-19) illustre spécifiquement une détection par de l'outillage de monitoring (Sentry) plutôt que par revue de code ou remontée utilisateur — preuve que la boucle détection → correction fonctionne aussi via la supervision mise en place, pas seulement en amont.
**Statut** : ✅

### 3.9 C2.4.1 — Manuels de déploiement, d'utilisation et de mise à jour
**Documents** :
- `MANUEL_DEPLOIEMENT.md` — *« volet manuel de déploiement »* : environnement de dev, build Docker, pipelines CI/CD, critères qualité/perf.
- `MANUEL_UTILISATION.md` — *« volet manuel d'utilisation »* : prise en main pour un citoyen ou un agent municipal, FAQ.
- `MANUEL_MISE_A_JOUR.md` — *« volet manuel de mise à jour »* : migrations, redéploiement, rôles, dépendances.
**Statut** : ✅

## 4. Écarts connus

- **C2.1.2** : pas de `tsc --noEmit` ni de lint rejoués automatiquement en CI (SWC transpile sans vérifier les types).
- **C2.2.3 (accessibilité)** : contraste couleur RGAA non vérifiable sous `jsdom`, jamais testé en navigateur réel.
- **C2.2.3 (A09, résiduel)** : la revue des logs de requêtes Supabase (seule couche qui verrait un contournement complet du frontend) est manuelle, pas d'alerte automatique native sur ces logs côté Supabase (plan gratuit) — l'alerte Sentry couvre le volet applicatif/client, pas ce volet-là. Détail : `SECURITE.md` §4.
- **C2.3.1** : 12/87 scénarios de recette non exécutés, raison documentée sur chaque ligne (`CAHIER_DE_RECETTES.md`).

A06 est désormais fermé (`npm audit` en CI depuis le 2026-07-19) et retiré de cette liste. A09 est largement fermé (télémétrie applicative + alerte Sentry depuis le 2026-07-19, cf. `SECURITE.md` §4) — seule la revue des logs Supabase reste manuelle plutôt qu'alertée automatiquement, listée ci-dessus comme limite résiduelle assumée, pas un blocage du critère. Aucun de ces écarts ne concerne un critère au rouge — tous les critères C2 listés en §2 sont satisfaits ; ce sont des marges de progression documentées, dans l'esprit du projet (limites écrites explicitement plutôt que masquées, cf. `SECURITE.md`/`ACCESSIBILITE.md`).
