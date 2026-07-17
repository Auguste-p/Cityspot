
  # City Spot App

  This is a code bundle for City Improvement Photo App. The original project is available at https://www.figma.com/design/XktHdCVAyIvYDDu09QAoAN/City-Improvement-Photo-App.

  ## Running the code

  Run `npm i` to install the dependencies.

  Run `npm run dev` to start the development server.

## Supabase

The app expects a public browser-safe key in `.env`:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Do not use a service-role or secret key in the browser. If the anon key is missing, the app falls back to local mock data.

## Tests & couverture

```bash
npm test              # 100 tests (unitaires + accessibilité RGAA)
npm run test:coverage # idem + rapport de couverture
```

Exécutés automatiquement sur chaque push/PR vers `main` (`.github/workflows/ci.yml`). Le rapport de couverture (HTML + JSON) est déposé en artefact CI (`coverage-report`, 30 jours de rétention) à chaque run — voir l'onglet *Actions* du dépôt.

Dernière mesure locale (2026-07-17) :

| Dossier | % Lignes couvertes |
|---|---|
| **`src` (ensemble)** | **81.27 %** |
| `src/lib`, `src/constants` | 100 % |
| `src/context` | 94.23 % |
| `src/hooks` | 95.04 % |
| `src/schemas` | 100 % |
| `src/components` (écrans) | 85.91 % |
| `src/components/ui` | 85.15 % |
| `src/services` | 64.75 % |

Détail fichier par fichier, ce que chaque test vérifie et pourquoi : [`TESTS.md`](./TESTS.md). Référentiel d'accessibilité (RGAA 4.1), méthode et limites : [`ACCESSIBILITE.md`](./ACCESSIBILITE.md). Mesures de sécurité mappées à l'OWASP Top 10 : [`SECURITE.md`](./SECURITE.md). Scénarios de recette exécutés : [`CAHIER_DE_RECETTES.md`](./CAHIER_DE_RECETTES.md). Bogues détectés, corrigés ou en attente de correctif : [`PLAN_CORRECTION_BOGUES.md`](./PLAN_CORRECTION_BOGUES.md).

## Documentation

- [`MANUEL_DEPLOIEMENT.md`](./MANUEL_DEPLOIEMENT.md) — build et déploiement de l'image Docker, pipeline CI/CD.
- [`MANUEL_UTILISATION.md`](./MANUEL_UTILISATION.md) — prise en main de l'application pour un utilisateur (citoyen ou agent municipal).
- [`MANUEL_MISE_A_JOUR.md`](./MANUEL_MISE_A_JOUR.md) — faire évoluer le logiciel : migrations base de données, dépendances, redéploiement.
- [`SECURITE.md`](./SECURITE.md) — mapping des mesures de sécurité à l'OWASP Top 10.
- [`CHANGELOG.md`](./CHANGELOG.md) — historique des versions (tags Git), traçabilité des évolutions du prototype.

# Avancée du jour avec IA

La conversation a commencé par une analyse globale d’une app React/Vite récupérée depuis Figma, avec un focus sur l’organisation, la lisibilité, la performance et la sécurité. Les problèmes principaux identifiés étaient des logiques dupliquées autour des votes/statuts, un état utilisateur/role câblé en dur, un composant de création de post trop monolithique, un rendu décoratif inutilement lourd sur la vue carte, et quelques imports de dépendances versionnés qui rendaient le code plus fragile.

Ensuite, l’échange est passé en mode exécution. Le code a été refactoré pour centraliser la logique métier, extraire un composant de carte de post réutilisable, introduire un contexte utilisateur partagé, découper la création de post en sous-sections plus lisibles, et nettoyer les imports de notifications. En parallèle, une passe sécurité a été faite sur les dépendances: l’audit avait d’abord remonté 3 vulnérabilités hautes, puis une mise à jour ciblée de Vite a ramené l’audit à zéro vulnérabilité.

La base est maintenant dans un meilleur état structurel et la validation est verte: build de production réussi, TypeScript OK sur les fichiers touchés, audit npm propre. La suite logique, si on continue, serait surtout du nettoyage de dette générée et, si l’app doit évoluer, le remplacement du faux utilisateur par une vraie source d’authentification ou de session.

Le nettoyage est terminé. Tous les imports versionnés restants dans ui ont été normalisés vers les noms de packages standards, et vite.config.ts a été simplifié en retirant les alias devenus inutiles. Il n’y a plus de specifiers versionnés dans la couche UI.

## Nouvelle passe IA pour l'optimisation de la taille du build de l'app
### Ce que j’ai appliqué
- Code-splitting des pages via lazy routes dans routes.ts
- Optimisation des calculs lourds dans MunicipalView.tsx
- Nettoyage et optimisation de rendu dans MapView.tsx

### Détails utiles
- Dans routes.ts, les pages sont désormais chargées à la demande (MapView, CreatePost, PostDetail, Profile, Settings, MunicipalView), au lieu d’être toutes packées d’entrée.
- Dans MunicipalView.tsx, j’ai mémoïsé:
les comptes par catégorie
les listes filtrées
les sections en vote / en cours / terminées
- Dans MapView.tsx, j’ai:
sorti les positions de marqueurs en constante
mémoïsé certains calculs dérivés
remplacé des boutons custom par le composant UI Button

### Impact build

Avant, nous avions un gros bundle principal autour de 511 kB.
Après cette passe, le build est splitté en chunks de page, et le principal est descendu à environ 270.72 kB.

Build OK, pas d’erreurs TypeScript.