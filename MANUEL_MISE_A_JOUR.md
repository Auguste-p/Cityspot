# Manuel de mise à jour — City Spot

## 1. Objet du document

Ce document décrit comment faire évoluer City Spot une fois déployé : mettre à jour le code, la base de données, les dépendances, et attribuer des rôles. Il répond au critère C2.4.1 de la grille d'évaluation, volet *« manuel de mise à jour »*.

Pour le déploiement initial, voir [`MANUEL_DEPLOIEMENT.md`](./MANUEL_DEPLOIEMENT.md). Pour l'usage fonctionnel de l'application, voir [`MANUEL_UTILISATION.md`](./MANUEL_UTILISATION.md).

## 2. Vue d'ensemble de la stack

| Composant | Techno | Où le modifier |
|---|---|---|
| Frontend | React 19 + Vite + TypeScript | `src/` |
| Base de données + auth | Supabase (Postgres + RLS) | `supabase/migrations/` |
| Hébergement | Docker (build Vite) + nginx | `Dockerfile`, `nginx.conf` |
| CI | GitHub Actions | `.github/workflows/ci.yml` |

## 3. Environnement de développement

```bash
npm install
npm run dev            # serveur de dev, http://localhost:5173
npm test                # 100 tests (unitaires + accessibilité RGAA)
npm run test:coverage   # idem + rapport de couverture (coverage/)
npm run build            # build de production (vérifie aussi le typage TS via Vite)
```

`.env` doit contenir `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` (clé publique uniquement — jamais de clé service-role, cf. §7.3). Sans ces variables, l'app bascule sur des données locales de secours (`hasSupabaseConfig = false`), utile pour développer sans base réelle.

## 4. Cycle de modification du code

1. Créer une branche depuis `main`.
2. Développer en suivant les tests existants comme filet de sécurité — toute modification de composant ou de service devrait garder `npm test` vert. `TESTS.md` détaille ce que chaque fichier de test vérifie.
3. Si la modification touche une fonctionnalité livrée, mettre à jour le scénario correspondant dans `CAHIER_DE_RECETTES.md` (statut, étapes) plutôt que d'en ouvrir un nouveau en doublon.
4. Ouvrir une pull request vers `main` : `.github/workflows/ci.yml` exécute automatiquement `npm run test:coverage` puis `npm run build` ; la fusion est bloquée si l'un des deux échoue.
5. Une fois fusionnée sur `main` et la recette validée, poser un tag de version (ci-dessous) — le déploiement en production part de là, automatiquement.

Chaque mise en production est marquée d'un tag Git annoté, suivant SemVer (`vMAJOR.MINOR.PATCH`) :

```bash
git tag -a vX.Y.Z -m "Résumé de la version"
git push origin vX.Y.Z
```

Pousser ce tag déclenche `.github/workflows/deploy.yml` : build de l'image, publication sur GHCR, puis redéploiement automatique sur le VPS — détail complet dans `MANUEL_DEPLOIEMENT.md` §8. Rien à faire manuellement au-delà du tag, une fois la mise en place initiale du VPS faite.

Le détail de chaque version vit dans [`CHANGELOG.md`](./CHANGELOG.md) ; `PLAN_CORRECTION_BOGUES.md` complète avec le détail des correctifs entre deux versions.

## 5. Mettre à jour la base de données

Les évolutions de schéma vivent dans `supabase/migrations/`, un fichier `.sql` par changement, nommé `YYYYMMDDHHMMSS_description.sql`.

```bash
supabase db push        # applique les migrations non encore jouées sur le projet Supabase distant
```

**Particularité de ce dépôt** : les migrations déjà appliquées sont régulièrement supprimées du dossier local une fois poussées — le dossier `supabase/migrations/` n'est donc **pas** l'historique fiable des évolutions de schéma. L'historique de référence est `PLAN_CORRECTION_BOGUES.md`, qui documente chaque migration significative (objet, cause, contenu) au fil des correctifs. Avant d'écrire une nouvelle migration, s'y référer pour connaître l'état réel du schéma en base plutôt que de se fier au contenu du dossier.

Pour une nouvelle migration :

1. Créer le fichier `supabase/migrations/<horodatage>_<description>.sql`.
2. Écrire le DDL (colonnes, contraintes, policies RLS). Toute nouvelle table exposée à l'API doit recevoir des policies RLS explicites — ne jamais laisser de policy permissive du type `"all for all"` (cf. `PLAN_CORRECTION_BOGUES.md`, BUG-10/BUG-13, pour l'exemple de ce qu'il ne faut pas reproduire).
3. `supabase db push`.
4. Vérifier avec une sonde REST directe (avec et sans authentification, avec un compte tiers) que les policies bloquent bien l'accès non autorisé — méthode utilisée pour SEC-10/SEC-11 dans `CAHIER_DE_RECETTES.md`.

## 6. Tâches d'administration courantes

### 6.1 Attribuer le rôle municipal à un compte

Le rôle municipal se lit exclusivement dans `public.users.role` (source de vérité unique depuis la migration `20260717070000_add_users_role.sql` — voir `PLAN_CORRECTION_BOGUES.md`, BUG-12). Il n'existe pas d'interface pour le changer soi-même ; c'est une opération d'administration en base :

```sql
update public.users set role = 'municipal' where id = '<uuid-du-compte>';
```

Le compte obtient alors l'accès à `/municipal`, le bouton de navigation dédié et le badge "Mairie" sur son profil, sans étape supplémentaire.

### 6.2 Mettre à jour les dépendances

```bash
npm outdated
npm audit                # vérifier l'absence de vulnérabilités connues avant/après mise à jour
npm update
npm run build && npm test  # valider qu'une montée de version n'a rien cassé
```

`package-lock.json` est volontairement dans `.gitignore` (voir `MANUEL_DEPLOIEMENT.md`, §7) : chaque installation régénère ses propres versions verrouillées dans les bornes de `package.json`. Committer le lockfile est une évolution possible si des versions figées deviennent nécessaires.

### 6.3 Rotation d'une clé Supabase

Régénérer la clé anonyme depuis le tableau de bord Supabase, mettre à jour `.env` et les secrets GitHub Actions (`VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY`), puis reconstruire l'image (`MANUEL_DEPLOIEMENT.md`, §3). Ne jamais placer de clé `service-role`/secrète côté client : `getSupabaseClient()` la rejette explicitement au démarrage si elle commence par `sb_secret_` (test couvrant ce comportement : `src/services/*` — voir `TESTS.md`).

## 7. Où regarder en cas de régression

| Symptôme après une mise à jour | Piste |
|---|---|
| Tests rouges en CI | `coverage-report` (artefact CI) + logs de `npm run test:coverage` |
| Comportement RGAA cassé | `ACCESSIBILITE.md` §4 liste les tests d'accessibilité par écran |
| Accès non autorisé à une donnée | Vérifier les policies RLS de la table concernée (`supabase/migrations/`, historique dans `PLAN_CORRECTION_BOGUES.md`) |
| Fonctionnalité qui régresse silencieusement | Rejouer le scénario correspondant dans `CAHIER_DE_RECETTES.md` |
