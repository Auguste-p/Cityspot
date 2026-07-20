FROM node:22-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# DSN Sentry : pas un secret (conçu pour être public côté client), simple build arg.
ARG VITE_SENTRY_DSN
ENV VITE_SENTRY_DSN=$VITE_SENTRY_DSN

# Tag Git (ex: v1.2.1) affiché en bas de page — pas un secret non plus.
ARG VITE_APP_VERSION
ENV VITE_APP_VERSION=$VITE_APP_VERSION

RUN --mount=type=secret,id=VITE_SUPABASE_URL,required=true \
    --mount=type=secret,id=VITE_SUPABASE_ANON_KEY,required=true \
    sh -c 'export VITE_SUPABASE_URL=$(cat /run/secrets/VITE_SUPABASE_URL); \
    export VITE_SUPABASE_ANON_KEY=$(cat /run/secrets/VITE_SUPABASE_ANON_KEY); \
    if [ -z "$VITE_SUPABASE_URL" ] || [ -z "$VITE_SUPABASE_ANON_KEY" ]; then \
      echo "ERROR: VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY secrets are empty" >&2; exit 1; \
    fi; \
    npm run build'

FROM nginx:alpine-slim
COPY --from=build /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
