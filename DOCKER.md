# Lancer Cityspot avec Docker

## Prérequis

- Docker avec BuildKit (par défaut sur Docker récent / OrbStack).
- Un fichier `.env` à la racine avec `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` (voir `README.md`).

## Build de l'image

Les clés Supabase sont nécessaires **au build** (Vite les intègre dans le bundle JS, pas au runtime). Elles sont passées via `--secret`, jamais en `--build-arg` ni en clair dans la commande — elles n'apparaissent donc ni dans l'historique du shell ni dans `docker history`.

```bash
set -a; source .env; set +a

docker build \
  --secret id=VITE_SUPABASE_URL,env=VITE_SUPABASE_URL \
  --secret id=VITE_SUPABASE_ANON_KEY,env=VITE_SUPABASE_ANON_KEY \
  -t cityspot .
```

## Lancer le conteneur

```bash
docker run -d --name cityspot -p 8080:80 cityspot
```

L'app est servie par nginx sur `http://localhost:8080`. Le routing côté client (react-router) fonctionne grâce au fallback SPA défini dans `nginx.conf`.

## Arrêter / nettoyer

```bash
docker rm -f cityspot
```

## En CI (GitHub Actions)

Mêmes deux secrets, mais définis dans les *Secrets* du repo GitHub et injectés via `docker/build-push-action` :

```yaml
- uses: docker/build-push-action@v6
  with:
    context: .
    secrets: |
      VITE_SUPABASE_URL=${{ secrets.VITE_SUPABASE_URL }}
      VITE_SUPABASE_ANON_KEY=${{ secrets.VITE_SUPABASE_ANON_KEY }}
```

## À savoir avant un déploiement VPS

`package-lock.json` est dans `.gitignore` — un `git clone` frais n'aura pas ce fichier. Le `Dockerfile` utilise `npm install` (pas `npm ci`) pour cette raison. Committer le lockfile permettrait de repasser sur `npm ci`, plus rapide et déterministe.
