# Manuel de déploiement — City Spot

## 1. Objet du document

Ce document décrit comment construire, configurer et déployer City Spot en production (conteneur Docker + nginx), ainsi que le pipeline d'intégration/déploiement continu qui l'automatise. Il répond au critère C2.4.1 de la grille d'évaluation, volet *« manuel de déploiement »*.

Pour l'historique des versions et la procédure de mise à jour d'une instance déjà déployée (migrations base de données, redéploiement de la fonction Edge, montée de version des dépendances), voir [`MANUEL_MISE_A_JOUR.md`](./MANUEL_MISE_A_JOUR.md). Pour la prise en main de l'application par un utilisateur final, voir [`MANUEL_UTILISATION.md`](./MANUEL_UTILISATION.md).

## 2. Prérequis

- Docker avec BuildKit (par défaut sur Docker récent / OrbStack).
- Un fichier `.env` à la racine avec `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` (voir `README.md`).

## 3. Build de l'image

Les clés Supabase sont nécessaires **au build** (Vite les intègre dans le bundle JS, pas au runtime). Elles sont passées via `--secret`, jamais en `--build-arg` ni en clair dans la commande — elles n'apparaissent donc ni dans l'historique du shell ni dans `docker history`.

```bash
set -a; source .env; set +a

docker build \
  --secret id=VITE_SUPABASE_URL,env=VITE_SUPABASE_URL \
  --secret id=VITE_SUPABASE_ANON_KEY,env=VITE_SUPABASE_ANON_KEY \
  -t cityspot .
```

## 4. Lancer le conteneur

```bash
docker run -d --name cityspot -p 8080:80 cityspot
```

L'app est servie par nginx sur `http://localhost:8080`. Le routing côté client (react-router) fonctionne grâce au fallback SPA défini dans `nginx.conf`.

## 5. Arrêter / nettoyer

```bash
docker rm -f cityspot
```

## 6. Pipeline d'intégration et de déploiement continu (GitHub Actions)

Chaque push ou pull request vers `main` déclenche `.github/workflows/ci.yml` : installation des dépendances, exécution de la suite de tests avec couverture (`npm run test:coverage`), build de production (`npm run build`), puis dépôt du rapport de couverture en artefact CI (`coverage-report`, 30 jours de rétention). Un build ou des tests en échec bloquent la fusion.

Le déploiement de l'image Docker en production réutilise les mêmes deux secrets que le build local (§3), définis cette fois dans les *Secrets* du dépôt GitHub et injectés via `docker/build-push-action` :

```yaml
- uses: docker/build-push-action@v6
  with:
    context: .
    secrets: |
      VITE_SUPABASE_URL=${{ secrets.VITE_SUPABASE_URL }}
      VITE_SUPABASE_ANON_KEY=${{ secrets.VITE_SUPABASE_ANON_KEY }}
```

## 7. À savoir avant un déploiement VPS

`package-lock.json` est dans `.gitignore` — un `git clone` frais n'aura pas ce fichier. Le `Dockerfile` utilise `npm install` (pas `npm ci`) pour cette raison. Committer le lockfile permettrait de repasser sur `npm ci`, plus rapide et déterministe.
