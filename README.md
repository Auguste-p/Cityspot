
  # City Spot App
  
Accessible à l'adresse https://projet-cityspot.fr/ !

  ## Running the code

  Lancer `npm i` pour installer les dépendances.

  Lancer `npm run dev` pour démarrer le serveur de développement.

## Supabase

Les clés supabase sont stockées dans un fichier non public `.env`:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

N'utilisez pas de rôle de service ni de clé secrète dans le navigateur. Si la clé anonyme est absente, l'application bascule sur des données fictives locales.

## Tests & couverture

```bash
npm test              # 110 tests (unitaires + accessibilité RGAA)
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

Détail fichier par fichier, ce que chaque test vérifie et pourquoi : [`TESTS.md`](./docs/TESTS.md). Référentiel d'accessibilité (RGAA 4.1), méthode et limites : [`ACCESSIBILITE.md`](./docs/ACCESSIBILITE.md). Mesures de sécurité mappées à l'OWASP Top 10 : [`SECURITE.md`](./docs/SECURITE.md). Scénarios de recette exécutés : [`CAHIER_DE_RECETTES.md`](./docs/CAHIER_DE_RECETTES.md). Bogues détectés, corrigés ou en attente de correctif : [`PLAN_CORRECTION_BOGUES.md`](./docs/PLAN_CORRECTION_BOGUES.md).

## Documentation

Tous les documents détaillés sont dans [`docs/`](./docs).

- [`DOSSIER_CERTIFICATION.md`](./docs/DOSSIER_CERTIFICATION.md) — dossier de synthèse consolidé (présentation, architecture, qualité, tests) pour la certification.
- [`ARCHITECTURE.md`](./docs/ARCHITECTURE.md) — composants, flux de données, frontières de confiance.
- [`MANUEL_DEPLOIEMENT.md`](./docs/MANUEL_DEPLOIEMENT.md) — build et déploiement de l'image Docker, pipeline CI/CD.
- [`MANUEL_UTILISATION.md`](./docs/MANUEL_UTILISATION.md) — prise en main de l'application pour un utilisateur (citoyen ou agent municipal).
- [`MANUEL_MISE_A_JOUR.md`](./docs/MANUEL_MISE_A_JOUR.md) — faire évoluer le logiciel : migrations base de données, dépendances, redéploiement.
- [`SECURITE.md`](./docs/SECURITE.md) — mapping des mesures de sécurité à l'OWASP Top 10.
- [`CHANGELOG.md`](./docs/CHANGELOG.md) — historique des versions (tags Git), traçabilité des évolutions du prototype.
- [`GRILLE_EVALUATION.md`](./docs/GRILLE_EVALUATION.md) — index : quel document répond à quel critère de la grille d'évaluation.
