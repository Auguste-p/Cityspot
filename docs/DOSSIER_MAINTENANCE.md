# Dossier de maintenance en condition opérationnelle — City Spot

**Candidat** : Auguste P. — **Projet** : City Spot (signalement citoyen de dégradations urbaines)
**Dépôt** : `github.com/Auguste-p/Cityspot` — **Version en production** : `v2.1.0` — **Date** : 11/08/2026

> Simulation de situation de travail — BLOC 4 : *Maintenir l'application logicielle en condition opérationnelle*. Ce dossier répond aux huit points attendus du livrable : monitoring, traitement des anomalies et maintenance du logiciel développé au cours du projet. Chaque section s'appuie sur du code, de la configuration et des journaux réellement présents dans le dépôt — pas sur une description abstraite du processus — et renvoie vers le document source complet pour le détail exhaustif. Index complet critère → document : [`GRILLE_EVALUATION.md`](./GRILLE_EVALUATION.md).

---

## Sommaire

1. La description du processus de mise à jour des dépendances
2. La description du système de supervision
3. La description du processus de collecte et de consignation des anomalies
4. La présentation d'une fiche de consignation d'une anomalie rencontrée au cours du projet
5. La présentation du traitement d'une anomalie détectée au cours du projet
6. Les recommandations argumentées d'amélioration
7. Un exemplaire du journal de version
8. Un exemple de problème résolu en collaboration avec le support client

**Contexte du projet** : City Spot est une application web (React 19 + TypeScript + Vite) qui permet à des citoyens de signaler des dégradations sur la voie publique, de voter pour prioriser les signalements, et à des agents municipaux de piloter leur traitement via une vue dédiée. Le backend est entièrement managé (Supabase — Postgres + Auth), sans serveur applicatif intermédiaire : toute la logique d'autorisation repose sur la sécurité au niveau ligne (*Row Level Security*) de Postgres. L'application est déployée en continu sur un VPS OVH dédié, avec une pile de supervision complète (Prometheus, Grafana, Sentry). C'est cette chaîne complète — dépendances, supervision, anomalies, amélioration continue — que ce dossier documente.

---

## 1. La description du processus de mise à jour des dépendances

### 1.1 Périmètre et fréquence

City Spot est un frontend seul parlant à un backend managé — le périmètre des dépendances à maintenir est donc entièrement circonscrit à `package.json`/`package-lock.json` ; Supabase, en tant que service géré, n'a pas de dépendance applicative à mettre à jour côté code.

| Aspect | Réponse |
|---|---|
| **Fréquence** | Détection **automatique et systématique** à chaque `push`/pull request vers `main` (`npm audit`, en CI). Montée de version **à la demande**, pas de cadence calendaire fixée — pas d'outil de veille automatique des nouvelles versions à ce jour (Dependabot/Renovate), traité en recommandation §6. |
| **Périmètre** | L'ensemble des dépendances npm du projet (21 dépendances de production, 18 de développement — détail 1.2), frontend uniquement. |
| **Type** | Détection automatique (CI, bloque la fusion) ; mise à jour manuelle, procédure documentée ci-dessous. |

### 1.2 Dépendances de production principales

| Dépendance | Rôle |
|---|---|
| `react` / `react-dom` | Framework UI |
| `react-router` | Routage, chargement paresseux par route |
| `@supabase/supabase-js` | Client Postgres + Auth managé |
| `react-hook-form` + `@hookform/resolvers` + `zod` | Formulaires et validation déclarative |
| `maplibre-gl` | Carte interactive (fond OpenStreetMap) |
| `@sentry/react` | Tracking d'erreurs frontend en production |
| `@radix-ui/*` | Primitives d'interface accessibles (dialogues, onglets, interrupteurs…) |
| `sonner` | Notifications toast |

### 1.3 Procédure de mise à jour manuelle

Documentée dans `MANUEL_MISE_A_JOUR.md` §6.2 :

```bash
npm outdated              # identifie les versions disponibles plus récentes
npm audit                 # vérifie l'absence de vulnérabilités connues avant/après mise à jour
npm update
npm run build && npm test  # valide qu'une montée de version n'a rien cassé
```

`package-lock.json` est committé depuis le 2026-07-20 (v1.3.1) : après `npm update`, le lockfile mis à jour doit être committé avec le reste du changement, sans quoi la CI et le `Dockerfile` (`npm ci`, qui installe strictement depuis le lockfile) réinstalleraient les anciennes versions verrouillées.

### 1.4 Le gate automatique en CI

```yaml
- run: npm ci
# Fails the build on high/critical vulnerabilities in what ships to production
# (OWASP A06, see SECURITE.md). Scoped to --omit=dev: the remaining dev-only chain
# (eslint's own bundled minimatch/brace-expansion) has no fix that doesn't break
# eslint-plugin-jsx-a11y's peer range (eslint ^9 max) — tracked in MAINTENANCE.md §6.
- run: npm audit --omit=dev --audit-level=high
```

### 1.5 Le processus mis à l'épreuve en conditions réelles (2026-07-29)

Le 2026-07-29, `npm audit --audit-level=high` a fait échouer la CI sur **3 avis de sécurité hauts**, ce qui a permis de dérouler le processus décrit ci-dessus jusqu'au bout, sur un cas réel plutôt que théorique :

**Diagnostic** : trois failles remontées — `brace-expansion` (DoS par expansion non bornée), `postcss` (traversée de chemin sur les source maps) et `react-router` (contournement CSRF en mode RSC).

**Traitement, poste par poste** :

- **`postcss` et `react-router`** (dépendances de **production**) : `npm audit fix` (montée de version non cassante) a suffi — les deux failles ont disparu sans aucun changement de code applicatif.
- **`brace-expansion`** (dépendance transitive, imbriquée dans `eslint` et `eslint-plugin-jsx-a11y`, outillage de développement uniquement, jamais exécuté en production) : investigation plus poussée, résumée ici parce qu'elle illustre bien la différence entre *corriger* et *masquer* une vulnérabilité :
  1. Un override direct de `brace-expansion` vers la version corrigée casse `eslint` au runtime (`TypeError: expand is not a function`) — la version corrigée a changé la forme de son export, incompatible avec l'ancien `minimatch@3.1.5` dont dépend `eslint` en interne.
  2. Tentative de montée d'`eslint` en version majeure (qui abandonne cette chaîne de dépendances) : réussit à faire disparaître la faille, **mais** casse le peer dependency d'`eslint-plugin-jsx-a11y@6.10.2`, qui ne déclare officiellement le support que jusqu'à `eslint@^9`.
  3. Tentative parallèle de montée de `vitest`/`@vitest/coverage-v8` en version majeure (pour fermer une chaîne de dépendance voisine) : fait chuter la couverture de tests mesurée de 81 % à 67 % — une régression du **remapping de couverture** (erreurs `PARSE_ERROR` silencieuses), pas une vraie perte de tests. Diff minimal préféré : ce bump a été annulé.
  4. **Décision retenue** : le gate `npm audit` en CI est restreint aux dépendances de production (`--omit=dev`, cf. 1.4). Les dépendances de production restent intégralement propres (0 vulnérabilité, vérifié) ; le résidu dev-only reste visible via `npm audit` en local sans bloquer la CI, et est documenté comme axe d'amélioration explicite (§6, recommandation n°4).

**Vérification post-correctif** : `typecheck`, `lint` (0 erreur), `test:coverage` (121 tests, couverture restaurée à 81 %) et `build` rejoués manuellement avant de considérer le correctif terminé — la même séquence que celle du gate CI.

Détail complet, y compris la chronologie exacte de l'investigation : [`MAINTENANCE.md`](./MAINTENANCE.md) §2.

---

## 2. La description du système de supervision

### 2.1 Périmètre

Le périmètre de supervision couvre trois couches distinctes, chacune avec son propre outillage :

| Couche | Outillage | Ce qui est surveillé |
|---|---|---|
| Infrastructure (hôte + conteneurs) | Prometheus, node-exporter, cAdvisor, Grafana | CPU, RAM, disque, métriques par conteneur, latence du reverse proxy |
| Infrastructure (alerte) | Alertmanager | Notification email automatique sur cible down ou saturation RAM/disque |
| Application (frontend) | Sentry | Erreurs JavaScript non interceptées en production |
| Sécurité applicative | Sentry (télémétrie dédiée) + revue des logs Supabase | Refus d'autorisation (garde de route, RLS), tentatives de contournement |
| Sécurité infrastructure | fail2ban | Brute-force SSH sur l'hôte |
| Usage (hors sécurité) | Matomo (auto-hébergé) | Analytics web, sans envoi de données à un tiers |

### 2.2 Les sondes, telles que déployées

Extrait de `docker-compose.yml` — la pile de supervision tourne en permanence sur le VPS, aux côtés de l'application :

```yaml
prometheus:
  image: prom/prometheus:latest
  restart: unless-stopped
  volumes:
    - ./prometheus.yml:/etc/prometheus/prometheus.yml:ro
    - ./alerting_rules.yml:/etc/prometheus/alerting_rules.yml:ro
    - prometheus_data:/prometheus

alertmanager:
  image: prom/alertmanager:latest
  restart: unless-stopped
  volumes:
    - ./alertmanager/alertmanager.yml:/etc/alertmanager/alertmanager.yml:ro
    - alertmanager_data:/alertmanager
  secrets:
    - smtp_password

node-exporter:
  image: prom/node-exporter:latest
  restart: unless-stopped
  pid: host
  volumes:
    - /proc:/host/proc:ro
    - /sys:/host/sys:ro
    - /:/rootfs:ro
  command:
    - "--path.procfs=/host/proc"
    - "--path.sysfs=/host/sys"
    - "--path.rootfs=/rootfs"

cadvisor:
  image: gcr.io/cadvisor/cadvisor:v0.49.1
  restart: unless-stopped
  privileged: true
  volumes:
    - /:/rootfs:ro
    - /var/run:/var/run:ro
    - /sys:/sys:ro
    - /var/lib/docker/:/var/lib/docker:ro

grafana:
  image: grafana/grafana:latest
  restart: unless-stopped
  environment:
    - GF_SECURITY_ADMIN_PASSWORD=${GRAFANA_ADMIN_PASSWORD}
    - GF_SERVER_ROOT_URL=https://grafana.projet-cityspot.fr
  volumes:
    - grafana_data:/var/lib/grafana
    - ./grafana/provisioning:/etc/grafana/provisioning:ro
```

`traefik` (reverse proxy public) expose lui aussi un point de métriques dédié, scrappé par Prometheus au même titre que l'hôte et les conteneurs :

```yaml
      - "--entrypoints.metrics.address=:8082"
      - "--metrics.prometheus=true"
      - "--metrics.prometheus.entrypoint=metrics"
```

Configuration de collecte, `prometheus.yml` (racine du dépôt) :

```yaml
global:
  scrape_interval: 15s

rule_files:
  - "alerting_rules.yml"

alerting:
  alertmanagers:
    - static_configs:
        - targets: ["alertmanager:9093"]

scrape_configs:
  - job_name: node
    static_configs:
      - targets: ["node-exporter:9100"]

  - job_name: cadvisor
    static_configs:
      - targets: ["cadvisor:8080"]

  - job_name: traefik
    static_configs:
      - targets: ["traefik:8082"]
```

Règles d'alerte évaluées par Prometheus, `alerting_rules.yml` (racine du dépôt) :

```yaml
groups:
  - name: cityspot
    rules:
      - alert: InstanceDown
        expr: up == 0
        for: 2m
        labels:
          severity: critical

      - alert: HostHighMemory
        expr: (1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) * 100 > 90
        for: 5m
        labels:
          severity: warning

      - alert: HostHighDisk
        expr: (1 - (node_filesystem_avail_bytes{fstype!~"tmpfs|overlay"} / node_filesystem_size_bytes{fstype!~"tmpfs|overlay"})) * 100 > 85
        for: 5m
        labels:
          severity: warning
```

Notification, `alertmanager/alertmanager.yml` — le mot de passe SMTP n'est jamais écrit dans ce fichier (versionné) : `smtp_auth_password_file` pointe vers un secret Docker Compose, monté depuis `/opt/cityspot/secrets/smtp_password` sur le VPS (non versionné, même traitement que `.env`, cf. `MANUEL_DEPLOIEMENT.md` §8.2) :

```yaml
global:
  smtp_smarthost: 'smtp.gmail.com:587'
  smtp_from: 'auguste.pasero@gmail.com'
  smtp_auth_username: 'auguste.pasero@gmail.com'
  smtp_auth_password_file: '/run/secrets/smtp_password'
  smtp_require_tls: true

route:
  receiver: email

receivers:
  - name: email
    email_configs:
      - to: 'auguste.pasero@gmail.com'
```

Grafana provisionne automatiquement sa source de données au démarrage — pas de configuration manuelle post-déploiement (`grafana/provisioning/datasources/prometheus.yml`) :

```yaml
apiVersion: 1

datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus:9090
    isDefault: true
```

### 2.3 Télémétrie de sécurité applicative

Le tracking d'erreurs standard (Sentry) ne suffit pas à voir un contournement de sécurité réussi — un refus d'autorisation n'est pas un crash. Le projet expose donc une fonction dédiée, `src/lib/sentry.ts` :

```ts
import * as Sentry from '@sentry/react';

const dsn = import.meta.env.VITE_SENTRY_DSN;

export function initSentry() {
  if (!dsn) {
    return;
  }

  Sentry.init({ dsn, tracesSampleRate: 0 });
}

// Refus d'autorisation métier (RLS, garde de route) : pas des bugs, mais des
// événements de sécurité (A09) — sans ça, un contournement RLS ou une
// tentative d'accès à /municipal ne laisse aucune trace.
export function logSecurityEvent(message: string, extra?: Record<string, unknown>) {
  if (!dsn) {
    return;
  }

  // Tag dédié : permet à une règle d'alerte Sentry de cibler uniquement ces
  // événements (volume anormal de refus), sans les confondre avec un crash JS.
  Sentry.captureMessage(message, { level: 'warning', tags: { security_event: true }, extra });
}
```

Cette fonction est appelée depuis `Layout.tsx` (garde de route `/municipal`) et `issuesService.ts` (`deleteIssue`/`updateIssue` refusés par la RLS) — chaque refus d'autorisation, quelle que soit sa source, remonte avec le même tag `security_event:true`.

**Règle d'alerte configurée sur ce tag** (Sentry → *Alerts* → *Create Alert* → *Issues*) :
- Filtre : `tags.security_event:true`.
- Condition : *"An issue is seen more than X times in Y minutes"* — un usage normal ne génère quasiment jamais ce refus, un scan ou une tentative de contournement applicatif, si.
- Action : notification vers l'adresse du projet.

**Logs de requêtes Supabase** — seuls logs qui verraient un contournement *complet* du frontend (appel REST direct sans passer par l'application, invisible pour `logSecurityEvent` qui ne s'exécute que dans le navigateur) : revue manuelle via *Dashboard Supabase → Logs → API/PostgREST Logs*, filtrable par méthode `DELETE`/`PATCH` pour repérer des tentatives répétées avec 0 ligne affectée (signature d'un refus RLS). Pas d'alerte automatique native sur ces logs côté Supabase (plan gratuit) — limite assumée et documentée.

### 2.4 Disponibilité

`traefik` renouvelle automatiquement le certificat TLS (Let's Encrypt) et route les requêtes vers chaque service par domaine (labels Docker, pas de fichier de configuration central à maintenir par ajout de service). Un redéploiement applicatif ne remplace **que** le conteneur `app` — `traefik` n'est jamais interrompu, donc pas de coupure TLS à chaque mise à jour.

**Détection d'indisponibilité par la métrique `up`** — pour chaque cible déclarée dans `scrape_configs` (`prometheus.yml`, §2.2 : `node-exporter:9100`, `cadvisor:8080`, `traefik:8082`), Prometheus génère automatiquement, sans instrumentation applicative, une série `up{job="<nom>"}` :
- `1` si le dernier scrape (toutes les 15 s, `scrape_interval`) a réussi ;
- `0` si la cible n'a pas répondu — conteneur arrêté, crashé, ou injoignable sur le réseau Docker.

Cette métrique suffit à elle seule à constater une indisponibilité, y compris à la main :
```promql
up{job="node"}      # hôte (node-exporter down = perte de visibilité CPU/RAM/disque)
up{job="cadvisor"}  # conteneurs (cadvisor down = perte de visibilité par conteneur)
up{job="traefik"}   # reverse proxy (traefik down = plus aucune requête routée)
```
Dans l'UI Prometheus (`Status → Targets`, accessible en interne via `docker exec` faute de routeur Traefik dédié, cf. `MANUEL_DEPLOIEMENT.md` §8.4), chaque cible est affichée avec son état (`UP`/`DOWN`) et l'horodatage du dernier scrape réussi — une cible passée à `DOWN` est visible au premier coup d'œil. Le même signal peut être ajouté à un dashboard Grafana (panel `Stat` sur `up`, seuil de couleur à `0`) pour une lecture encore plus directe.

**Alerte automatique** — cette même série `up` est aussi évaluée en continu par Prometheus via la règle `InstanceDown` de `alerting_rules.yml` (`up == 0` pendant 2 minutes), qui déclenche `alertmanager` : un email est envoyé sans qu'il soit nécessaire d'aller consulter le dashboard. Deux règles supplémentaires couvrent la saturation de ressources sur `node-exporter` (RAM > 90 %, disque > 85 %, pendant 5 minutes) — configuration détaillée en §2.2. La lecture manuelle décrite ci-dessus reste utile pour investiguer une alerte reçue (quelle cible, depuis quand), mais n'est plus le seul mécanisme de détection.

### 2.5 Limite assumée

`alertmanager` notifie uniquement par email, sur un seul destinataire (`auguste.pasero@gmail.com`) — pas de canal de repli (SMS, appel) en cas d'indisponibilité de la boîte mail elle-même, et pas de règle de désescalade si l'email reste sans action. Suffisant pour la volumétrie et l'équipe (un seul mainteneur) de ce projet ; un canal secondaire (webhook vers un outil de garde) serait la prochaine étape si l'équipe grandissait.

Détail complet, y compris les critères de qualité et de performance associés : [`MAINTENANCE.md`](./MAINTENANCE.md) §3 ; [`MANUEL_DEPLOIEMENT.md`](./MANUEL_DEPLOIEMENT.md) §8.4.

---

## 3. La description du processus de collecte et de consignation des anomalies

### 3.1 Sources de détection

Trois sources sont utilisées, structurées de la même façon quelle que soit leur origine :

1. **Revue de code** — pendant la rédaction du cahier de recettes ou l'investigation d'un autre bogue.
2. **Remontée utilisateur** — retour direct d'un utilisateur réel du prototype (avec, souvent, une capture d'écran).
3. **Outillage de supervision** — Sentry (§2) : un bogue détecté en production sans intervention humaine.

Auxquelles s'ajoutent, pour les anomalies de sécurité spécifiquement, des **sondes REST directes** (appels HTTP construits à la main, en contournant l'interface, pour vérifier que la Row Level Security bloque bien ce que l'UI empêche déjà visuellement) et des **tests automatisés d'accessibilité** (`axe-core`), qui font remonter de vraies violations plutôt que de simplement valider leur absence.

### 3.2 Répartition réelle des 18 anomalies du projet, par mode de détection

| Mode de détection | Nombre | Exemples |
|---|---|---|
| Revue de code / analyse d'un bogue voisin | 7 | BUG-03, BUG-04, BUG-05, BUG-11, BUG-12, BUG-13, BUG-14 |
| Remontée utilisateur | 5 | BUG-02, BUG-06, BUG-16, BUG-17, BUG-18 |
| Sonde REST directe / exécution de scénario de recette | 3 | BUG-01, BUG-09, BUG-10 |
| Test automatisé (accessibilité) | 2 | BUG-07, BUG-08 |
| Supervision en production (Sentry) | 1 | BUG-15 |
| **Total** | **18** | — |

Cette répartition montre que la boucle détection → correction fonctionne à **tous les stades du cycle de vie** : avant la mise en production (revue de code, sondes), pendant la recette (tests automatisés), et après la mise en production (remontée utilisateur, supervision) — pas seulement en amont.

### 3.3 Qualification

Chaque anomalie est qualifiée par **sévérité**, selon la légende du document de référence (`PLAN_CORRECTION_BOGUES.md` §2) :

- **Critique** : faille de sécurité ou perte de données exploitable.
- **Majeur** : fonctionnalité annoncée mais non opérante.
- **Mineur** : accessibilité, ergonomie, incohérence sans impact fonctionnel.

Répartition réelle : **5 Critiques, 9 Majeurs, 4 Mineurs** — 18 au total, tous corrigés et re-vérifiés à ce jour.

### 3.4 Format de consignation

Chaque anomalie est ensuite consignée dans une fiche structurée, toujours au même format : sévérité, méthode de détection, cause racine, correctif appliqué, méthode de vérification, statut — suffisamment détaillée pour être reproduite sans accès à son auteur. L'ensemble des fiches vit dans un document unique, [`PLAN_CORRECTION_BOGUES.md`](./PLAN_CORRECTION_BOGUES.md).

Détail du processus : [`MAINTENANCE.md`](./MAINTENANCE.md) §4.

---

## 4. La présentation d'une fiche de consignation d'une anomalie rencontrée au cours du projet

### 4.1 Fiche principale — détection par supervision

Fiche choisie parce qu'elle illustre la source de détection la plus rare (§3.2) — une anomalie repérée par l'outillage de supervision plutôt que par une revue de code ou un retour utilisateur :

> ### BUG-15 — Faux positifs Sentry : `AuthSessionMissingError` à chaque visite anonyme de `/login`
> - **Sévérité** : Mineur (aucun impact utilisateur — la page fonctionne normalement — mais pollue le suivi d'erreurs et masque de vrais incidents dans le bruit).
> - **Détecté par** Sentry : 3 alertes email reçues en production avec la pile d'appel `authService → supabase.auth.getUser() → AuthSessionMissingError`.
> - **Cause racine** : `LoginPage.tsx` appelle `getCurrentUser()` dans un `useEffect` au montage, sans gestion d'erreur, pour rediriger un utilisateur déjà connecté. L'API Supabase `auth.getUser()` ne renvoie pas `{ user: null, error: null }` en l'absence de session — elle renvoie une erreur nommée `AuthSessionMissingError`. `getCurrentUser()` la relançait comme n'importe quelle autre erreur, produisant une promesse rejetée non interceptée à **chaque** visite de `/login` par un visiteur non authentifié — le cas normal, pas un cas d'erreur.
> - **Correctif appliqué** (`src/services/authService.ts`) :
>
> ```diff
>  export async function getCurrentUser() {
>    const { data, error } = await getSupabaseClient()!.auth.getUser();
> +  // Pas de session (visiteur anonyme) : état normal, pas une erreur.
> +  if (error?.name === 'AuthSessionMissingError') return null;
>    if (error) throw error;
>    return data.user;
>  }
> ```
>
> - **Vérification** : test unitaire ajouté dans `authService.test.ts` — `getCurrentUser()` résout `null` (sans rejeter) sur `AuthSessionMissingError`, et continue de rejeter sur une autre erreur (réseau, etc.). Suite complète rejouée : 14/14 tests passants.
> - **Statut** : ✅ Corrigé et vérifié (2026-07-19).

### 4.2 Seconde fiche — pour contraste (détection par sonde technique, sévérité Critique)

À titre de comparaison, une anomalie de sévérité opposée, détectée par une méthode différente :

> ### BUG-10 — Modification arbitraire d'un signalement en contournant l'interface (SEC-10)
> - **Sévérité** : Critique — une policy RLS Postgres héritée du prototypage initial (`"all for all"`) autorisait **tout** compte authentifié à modifier les données d'un autre utilisateur, en construisant un appel `PATCH` direct vers l'API plutôt qu'en passant par l'interface.
> - **Détecté par** : sonde REST directe (SEC-10, `CAHIER_DE_RECETTES.md`) — un `PATCH` construit à la main sur la table `issues`, en contournant `updateIssue()` et sa vérification `created_by`, accepté sans erreur (`HTTP 200`).
> - **Correctif appliqué** : policies RLS scindées par opération (`SELECT`/`INSERT`/`UPDATE`/`DELETE`), chacune vérifiant explicitement `auth.uid() = created_by` pour les opérations d'écriture.
> - **Vérification** : SEC-10 rejoué après correctif → le même appel REST direct est refusé (0 ligne modifiée), re-vérifié sur les 5 tables concernées par le même défaut hérité (BUG-13).
> - **Statut** : ✅ Corrigé et vérifié.

Les deux fiches ci-dessus contiennent chacune assez d'information (pile d'appel ou requête exacte, condition de déclenchement, fichier concerné) pour être reproduites sans avoir eu accès à l'incident au moment où il s'est produit.

Source intégrale des 18 fiches : [`PLAN_CORRECTION_BOGUES.md`](./PLAN_CORRECTION_BOGUES.md).

---

## 5. La présentation du traitement d'une anomalie détectée au cours du projet

### 5.1 Le circuit de traitement, tel qu'outillé

```mermaid
sequenceDiagram
    participant Dev as Développeur
    participant GH as GitHub (PR → main)
    participant CI as ci.yml
    participant Tag as Tag Git vX.Y.Z
    participant CD as deploy.yml
    participant VPS as VPS (docker compose)

    Dev->>GH: Ouvre une PR avec le correctif
    GH->>CI: npm audit, typecheck, lint, test:coverage, build
    CI-->>GH: ✅ / ❌ (fusion bloquée si échec)
    GH->>Dev: Fusion sur main
    Dev->>Tag: git tag -a vX.Y.Z && git push origin vX.Y.Z
    Tag->>CD: déclenche le pipeline de déploiement
    CD->>CD: build image Docker, push GHCR
    CD->>VPS: SCP — sync docker-compose.yml, prometheus.yml, alerting_rules.yml, alertmanager/
    CD->>VPS: SSH — docker compose pull && up -d
    VPS-->>Dev: Correctif live (app systématiquement recréé ; prometheus/alertmanager seulement si leur config a changé)
```

Pipeline d'intégration continue, `.github/workflows/ci.yml` :

```yaml
- run: npm ci
- run: npm audit --omit=dev --audit-level=high
- run: npm run typecheck
- run: npm run lint
- run: npm run test:coverage
- run: npm run build
```

Pipeline de déploiement continu, `.github/workflows/deploy.yml` (déclenché par un tag `v*.*.*`) :

```yaml
on:
  push:
    tags:
      - "v*.*.*"

jobs:
  build-and-push:
    steps:
      - uses: docker/build-push-action@v6
        with:
          tags: |
            ghcr.io/auguste-p/cityspot:${{ github.ref_name }}
            ghcr.io/auguste-p/cityspot:latest
  deploy:
    needs: build-and-push
    steps:
      - uses: actions/checkout@v4
      # synchronise les fichiers d'infra (jamais dans l'image app) avant de relancer les conteneurs
      - uses: appleboy/scp-action@v0.1.7
        with:
          source: "docker-compose.yml,prometheus.yml,alerting_rules.yml,alertmanager"
          target: "/opt/cityspot"
      - uses: appleboy/ssh-action@v1
        with:
          script: |
            cd /opt/cityspot
            docker compose pull
            docker compose up -d
```

**Pourquoi cette étape** : `docker-compose.yml`, `prometheus.yml`, `alerting_rules.yml` et `alertmanager/` ne font pas partie de l'image `app` construite ci-dessus — sans cette synchronisation, toute modification de la supervision resterait figée dans le dépôt Git et ne s'appliquerait jamais en production. Avant l'ajout de cette étape (v2.1.0), ce fichier devait être copié à la main sur le VPS (`scp`) à chaque changement.

### 5.2 Exemple détaillé — BUG-17 / BUG-18 (v1.3.0)

Après inscription, un nouveau compte était silencieusement redirigé vers `/login` sans message (le projet Supabase exige une confirmation d'email avant l'ouverture d'une session, non anticipée par le code), et les coordonnées de sa ville n'étaient jamais enregistrées en base (l'appel de sauvegarde dépendait d'une session qui n'existait pas encore à ce moment précis).

**Correctif BUG-17** (`LoginPage.tsx`) — vérifie désormais si `signUp()` renvoie une session :

```ts
const { session } = await signUp(email, password, { name, city, cityLat, cityLng });

if (session) {
  navigate('/');
  return;
}

// Projet Supabase avec confirmation d'email activée : pas de session
// immédiate — informer plutôt que naviguer aveuglément vers '/'.
setInfo('Compte créé ! Vérifiez votre boîte mail pour confirmer votre inscription, puis connectez-vous.');
```

**Correctif BUG-18** — les coordonnées de ville passent désormais par `user_metadata` (comme `name`/`city`), insérées par le trigger serveur `handle_new_user()`, indépendamment de toute session client :

```ts
// src/services/authService.ts — signUp()
const { data, error } = await getSupabaseClient()!.auth.signUp({
  email,
  password,
  options: {
    data: profile, // { name, city, cityLat, cityLng } — insérés côté serveur par le trigger
    emailRedirectTo: `${window.location.origin}/login`,
  },
});
```

**Traitement complet** : bogues qualifiés (`PLAN_CORRECTION_BOGUES.md`) → correctifs écrits → PR fusionnée sur `main` (CI verte) → tag `v1.3.0` posé et poussé → `deploy.yml` construit l'image, la publie sur GHCR, redéploie le conteneur `app` sur le VPS → correctif documenté dans `CHANGELOG.md`, numéro de version affiché en bas de l'application (`VITE_APP_VERSION`, injecté au build depuis le tag).

### 5.3 Preuve que ce circuit reste actif — v2.0.2 (2026-07-29)

Le même processus complet a été rejoué le lendemain de la rédaction de ce dossier, pour une anomalie distincte : la création d'un signalement pouvait échouer avec une violation de la policy RLS Postgres (`new row violates row-level security policy for table "issues"`) si le formulaire était soumis avant la résolution asynchrone de la session (`UserContext`) — `created_by` valait alors `undefined`, silencieusement omis du payload JSON envoyé à l'API, donc `NULL` en base, refusé par la policy `with check (auth.uid() = created_by)`.

**Correctif appliqué** (`src/components/CreatePost.tsx`) :

```diff
   const onSubmit = async (data: CreatePostFormOutput) => {
+    if (!user) {
+      toast.error('Vous devez être connecté pour publier un signalement');
+      return;
+    }
+
     try {
       ...
-        created_by: user?.id,
+        created_by: user.id,
       });
```

**Timeline de ce traitement** :

| Étape | Résultat |
|---|---|
| Anomalie qualifiée et correctif écrit | Un garde-fou explicite avant tout appel réseau |
| Commit + push sur `main` | `fix: bloquer la création de signalement tant que la session n'est pas chargée` |
| CI (`ci.yml`) | ✅ audit, typecheck, lint, tests, build |
| Tag `v2.0.2` posé et poussé | Déclenche `deploy.yml` |
| Correctif documenté | `CHANGELOG.md`, entrée v2.0.2 |

Ce second exemple, plus récent que BUG-17/18, montre que le circuit décrit en 5.1 n'est pas une procédure figée à un instant du projet mais un mécanisme réellement rejoué à chaque anomalie découverte.

Détail complet : [`MAINTENANCE.md`](./MAINTENANCE.md) §5 ; [`MANUEL_MISE_A_JOUR.md`](./MANUEL_MISE_A_JOUR.md) §4.

---

## 6. Les recommandations argumentées d'amélioration

Trois axes, chacun mesuré sur l'état réel du projet plutôt qu'estimé à vue. Un quatrième axe (chargement de MapLibre GL hors de sa route) a été identifié puis appliqué depuis — détail dans le journal de version, §7.1 (v2.0.3).

### 6.1 État des lieux mesuré (base de raisonnement des recommandations)

Couverture de tests par dossier (`npm run test:coverage`, mesurée le 2026-07-19) :

| Dossier | % Lignes | Commentaire |
|---|---|---|
| **`src` (ensemble)** | **80,88 %** | Au-dessus du seuil visé |
| `src/lib`, `src/constants` | 100 % | |
| `src/hooks` | 95,04 % | |
| `src/schemas` | 100 % | |
| `src/context` | 85,5 % | |
| `src/components` (écrans) | 85,74 % | |
| `src/components/ui` | 85,15 % | |
| **`src/services`** | **63,52 %** | **Point le plus faible du projet** |

Critères de qualité et de performance (`MANUEL_DEPLOIEMENT.md` §9) :

| Axe | Critère | Mesure actuelle |
|---|---|---|
| Qualité — build | Le build de production doit réussir sans erreur | ✅ vérifié à chaque push/PR |
| Qualité — non-régression | La suite de tests doit être verte avant fusion | ✅ appliqué (121 tests) |
| Performance — bundle | Limiter le poids du chunk principal | 364 kB (`index-*.js`) — mesure historique de 270 kB (`MANUEL_DEPLOIEMENT.md` §9) désormais dépassée par les fonctionnalités ajoutées depuis ; `vendor-map` (MapLibre, 1 048 kB) reste séparé et ne charge plus sur les routes sans carte depuis le correctif v2.0.3 (§7.1) |
| Sécurité — dépendances | 0 vulnérabilité haute sur les dépendances de production | ✅ (§1) |

### 6.2 Les recommandations restantes

| # | Constat mesuré | Recommandation | Coût / délai | Gain attendu |
|---|---|---|---|---|
| 1 | `src/services` est la couche la moins couverte du projet (63,52 % de lignes contre 80,88 % pour l'ensemble), concentré sur les branches d'erreur Supabase (réseau, RLS refusée) peu exercées par les tests actuels. | Ajouter des cas de test ciblés sur les branches d'erreur non couvertes de `issuesService.ts`, en réutilisant les mêmes mocks que les tests existants (`vi.fn().mockResolvedValue({ error: ... })`). | Faible — ~1 jour, aucun outillage nouveau. | Réduit le risque de régression silencieuse sur le chemin le plus sensible (accès aux données) ; fait progresser un indicateur déjà cité en §6.1. |
| 2 | `eslint-plugin-jsx-a11y@6.10.2` limite son `peerDependencies` à `eslint@^9`, ce qui bloque la mise à jour d'`eslint` vers la v10 (cf. §1.5) et laisse un résidu `npm audit` non fermable côté outillage. | Surveiller la prochaine release d'`eslint-plugin-jsx-a11y` (`npm outdated`, cf. §1.3) et monter `eslint` dès qu'elle étend son support à `eslint@^10`. | Nul aujourd'hui (veille), quelques heures le jour où la mise à jour devient possible. | Ferme définitivement le résidu `brace-expansion` sans avoir à choisir entre un `eslint` obsolète et un plugin d'accessibilité cassé. |

**Recommandations déjà appliquées** :
- Le chargement de MapLibre GL hors des routes sans carte, initialement identifié ici, a été corrigé (v2.0.3) — détail complet dans le journal de version, §7.1, et `CHANGELOG.md`.
- La supervision infrastructure était consultée manuellement, sans alerte automatique en cas de saturation VPS ou de cible down. Un conteneur `alertmanager` a été ajouté à `docker-compose.yml`, avec trois règles dans `alerting_rules.yml` (`InstanceDown` sur `up == 0`, RAM > 90 %, disque > 85 %), notifiant par email via un secret Docker Compose. Détail : §2.4.

**Réalisme** : les recommandations restantes s'appuient sur des mesures déjà produites par l'outillage existant (`vite build`, `npm run test:coverage`, `npm audit`) — aucune n'introduit de nouvelle dépendance lourde ni de changement d'architecture ; elles complètent des écarts déjà nommés explicitement ailleurs dans la documentation plutôt que d'en inventer de nouveaux.

Détail complet : [`MAINTENANCE.md`](./MAINTENANCE.md) §6.

---

## 7. Un exemplaire du journal de version

Convention **SemVer** (`MAJOR.MINOR.PATCH`), un tag Git annoté par version, déclenchant automatiquement le déploiement (§5.1).

### 7.1 Extrait intégral des trois versions les plus récentes

> **v2.0.3 — 2026-08-10 — Correctif performance : MapLibre GL chargé sur toutes les routes malgré le découpage par route**
> `vite.config.ts` : `manualChunks` forçait `maplibre-gl` dans un chunk nommé `vendor-map` — Rollup traite un chunk nommé comme partagé et ajoutait un `import` statique vers lui dans toutes les routes (`LoginPage`, `Profile`, `Settings`...), malgré le découpage par route déjà en place dans `routes.ts`. Retrait du regroupement forcé : MapLibre reste désormais privé au chunk `MapView`. Vérifié par build + capture réseau : plus aucune requête vers `vendor-map-*` hors de la route carte.
>
> **v2.0.2 — 2026-07-29 — Correctif RLS à la création d'un signalement**
> `CreatePost.tsx` : la création d'un signalement pouvait échouer avec une violation de la policy RLS Postgres si le formulaire était soumis avant la résolution asynchrone de la session — `created_by` valait alors `undefined`, silencieusement omis du payload envoyé à l'API, donc `NULL` en base, refusé par la policy. La soumission est désormais bloquée avec un message clair tant que la session n'est pas chargée.
>
> **v2.0.1 — 2026-07-29 — Correctif CI : échec `npm audit`**
> `postcss` et `react-router` montés en version non cassante — corrige 2 vulnérabilités hautes sur des dépendances de production. Le gate `npm audit` en CI est restreint aux dépendances de production (détail §1.5).

### 7.2 Historique complet des versions

| Version | Date | Contenu |
|---|---|---|
| v0.1.0 | 2026-04-10 | Bascule des données mock vers Supabase |
| v0.2.0 | 2026-04-11 | Carte interactive (`maplibre-gl`), géolocalisation |
| v0.3.0 | 2026-06-29 | Authentification, commentaires, votes |
| v0.4.0 | 2026-07-09 | Conteneurisation Docker |
| v0.5.0 | 2026-07-15 | Intégration continue (GitHub Actions) |
| v1.0.0 | 2026-07-17 | Première version production-ready : recette exécutée, 14 bogues corrigés |
| v1.0.1 | 2026-07-18 | Premier déploiement réel sur VPS OVH |
| v1.1.0 | 2026-07-19 | Traefik, supervision (Prometheus/Grafana), analytics (Matomo), Sentry, fail2ban |
| v1.2.0 | 2026-07-20 | Recherche d'adresse, retrait de l'Edge Function `delete-issue` |
| v1.2.1 | 2026-07-20 | Correctif d'affichage de la carte en layout étroit |
| v1.3.0 | 2026-07-20 | Centrage carte sur la ville, robustesse inscription (BUG-17/18), typecheck + lint en CI |
| v1.3.1 | 2026-07-20 | `package-lock.json` committé, builds reproductibles (`npm ci`) |
| v1.3.2 | 2026-07-20 | Ajout de l'`emailRedirectTo` dans `signUp()` (lien de confirmation pointant vers le domaine réel plutôt que le Site URL par défaut) |
| v2.0.0 | 2026-07-29 | Documentation de maintenance (ce dossier, BLOC 4) |
| v2.0.1 | 2026-07-29 | Correctif CI `npm audit` |
| v2.0.2 | 2026-07-29 | Correctif RLS création de signalement |
| **v2.0.3** | **2026-08-10** | **Correctif performance : MapLibre GL ne fuite plus hors de sa route (`manualChunks`) (version actuelle en production)** |

Historique intégral, chaque entrée détaillée : [`CHANGELOG.md`](./CHANGELOG.md).

---

## 8. Un exemple de problème résolu en collaboration avec le support client

### 8.1 Cadre

City Spot est développé par une seule personne — il n'existe pas d'équipe support séparée du développement. Les parties prenantes réelles de cet exemple sont donc l'**utilisatrice/utilisateur rapporteur** (rôle citoyen, qui remonte un défaut d'usage réel) et le **développeur** (qui tient ici le rôle technique habituellement porté par un support de niveau 2 : diagnostic, correctif, vérification). C'est présenté tel quel plutôt que comme un faux scénario d'entreprise à plusieurs équipes.

### 8.2 Contexte du retour client

**BUG-16** (`PLAN_CORRECTION_BOGUES.md`) : remontée le 2026-07-20, *« la carte est à peine visible »*, accompagnée d'une capture d'écran montrant la carte réduite à une bande de quelques pixels sur mobile. La carte est la fonctionnalité centrale de l'application (visualisation des signalements) — le défaut rendait le produit quasiment inutilisable sur les formats d'écran les plus courants (mobile, et desktop en fenêtre étroite).

### 8.3 Résolution apportée

Le diagnostic s'est fait en trois passes successives, chacune révélant une cause plus profonde que la précédente :

1. Le panneau de liste des signalements, sans contrainte de hauteur en layout mobile, poussait la carte hors de l'écran par sa propre hauteur de contenu.
2. Une fois corrigé, une chaîne de `h-full` sur des `<div>` imbriqués ne se résolvait pas de façon fiable (dépendance circulaire hauteur parent/enfant).
3. Une fois passé en positionnement absolu, MapLibre GL reclassait lui-même son conteneur avec sa propre classe CSS embarquée (`maplibregl-map`, `position: relative`), écrasant silencieusement le positionnement posé par l'application.

**Correctif appliqué** (`src/components/MapView.tsx`) :

```diff
-      <div className="relative flex-1 bg-muted">
-        <div className="relative h-full min-h-[400px] lg:min-h-screen ..." role="region">
+      <div className="relative flex-1 min-h-[400px] bg-muted">
+        <div className="absolute inset-0 overflow-hidden ..." role="region">
           <div ref={mapContainerRef} className="cityspot-map h-full w-full" />
       ...
-      <div className="lg:w-96 bg-background border-t ...">
+      <div className="cityspot-details-panel lg:w-96 bg-background border-t ...">
```

Une classe CSS écrite à la main dans `src/index.css` complète le correctif — le projet n'a pas de build Tailwind actif, les variantes `lg:flex-none` n'existent donc pas dans le CSS statique et ne peuvent pas être ajoutées via une classe Tailwind ordinaire :

```css
/* ponytail: écrit à la main plutôt qu'en classes Tailwind — ce fichier est un
   export statique (pas de build Tailwind actif dans ce projet). Sur mobile,
   le panneau doit partager l'espace vertical avec la carte ; sur desktop
   (>= 1024px), il doit revenir à une largeur fixe sans grandir dans la ligne. */
.cityspot-details-panel {
  flex: 1 1 0%;
  min-height: 0;
}

@media (width >= 64rem) {
  .cityspot-details-panel {
    flex: none;
  }
}
```

Un `map.resize()` explicite a également été ajouté après le premier rendu : MapLibre capture sa propre caméra au moment de sa construction, avant que le conteneur n'ait nécessairement sa taille CSS finale.

### 8.4 Contribution des différentes parties prenantes

| Partie prenante | Contribution |
|---|---|
| Utilisatrice/utilisateur rapporteur | Signale le défaut avec une capture d'écran (donnée décisive : sans elle, un défaut visuel discret aurait été plus long à qualifier) ; confirme visuellement, à chaque itération de correctif intermédiaire, si le rendu est redevenu correct sur son propre appareil. |
| Développeur (rôle support technique) | Qualifie la sévérité (Majeur), diagnostique les trois causes successives via l'inspecteur du navigateur, écrit et déploie le correctif, sollicite une confirmation utilisateur après chaque étape plutôt qu'une seule fois à la fin. |

**Preuve** : `PLAN_CORRECTION_BOGUES.md`, BUG-16 — *« Vérification : diagnostic fait via l'inspecteur du navigateur (dimensions réelles de chaque élément de la chaîne), confirmé visuellement par l'utilisateur en mobile et en desktop après chaque correctif intermédiaire »*. Correctif livré en production dans la version `v1.2.1`, consolidé en `v1.3.0` (§7).

Détail complet : [`MAINTENANCE.md`](./MAINTENANCE.md) §7 ; [`PLAN_CORRECTION_BOGUES.md`](./PLAN_CORRECTION_BOGUES.md), BUG-16.

---

## Index des documents complets du dépôt

| Document | Contenu |
|---|---|
| [`MAINTENANCE.md`](./MAINTENANCE.md) | Version détaillée des 8 sections de ce dossier |
| [`PLAN_CORRECTION_BOGUES.md`](./PLAN_CORRECTION_BOGUES.md) | 18 fiches de consignation d'anomalies |
| [`CHANGELOG.md`](./CHANGELOG.md) | Journal de version complet |
| [`SECURITE.md`](./SECURITE.md) | Mapping OWASP Top 10, dont A06 (dépendances) et A09 (supervision) |
| [`TESTS.md`](./TESTS.md) | Couverture de tests détaillée, fichier par fichier |
| [`MANUEL_DEPLOIEMENT.md`](./MANUEL_DEPLOIEMENT.md) | Pipelines CI/CD, supervision infra en détail |
| [`MANUEL_MISE_A_JOUR.md`](./MANUEL_MISE_A_JOUR.md) | Procédure de mise à jour des dépendances, pas à pas |
| [`GRILLE_EVALUATION.md`](./GRILLE_EVALUATION.md) | Index critère de la grille → document |
