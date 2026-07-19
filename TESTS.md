# Tests unitaires — City Spot

## 1. Objet du document

Ce document liste les tests unitaires du projet, explique ce que chacun vérifie et pourquoi, et donne la couverture de code mesurée par fichier/dossier. Il répond au critère C2.2.2 de la grille d'évaluation (« Les tests unitaires couvrent la majorité du code développé »). Les tests d'accessibilité (RGAA) sont inclus dans ce même document ; leur référentiel et leur méthode sont détaillés dans `ACCESSIBILITE.md`.

## 2. Outillage

- **Framework** : [Vitest](https://vitest.dev/) 3.2.7 (déjà utilisé par le projet, cohérent avec Vite).
- **Rendu composants/hooks** : `@testing-library/react` (+ `jsdom` comme environnement DOM pour les fichiers qui en ont besoin).
- **Couverture** : `@vitest/coverage-v8` (provider natif V8, pas d'instrumentation supplémentaire à maintenir).
- **Accessibilité** : `axe-core`, exécuté directement dans les tests de composants (voir `src/test/a11y.ts` et `ACCESSIBILITE.md`).

```bash
npm test              # exécute les 100 tests
npm run test:coverage # exécute les tests + génère le rapport de couverture (table ci-dessous)
```

La couverture est calculée uniquement sur `src/**` (le dossier `build/`, qui contient le bundle compilé, est explicitement exclu de la configuration — l'inclure aurait fait chuter le pourcentage sans rapport avec le code réellement écrit). Voir `vite.config.ts`, clé `test.coverage`.

**En CI** (`.github/workflows/ci.yml`, C2.1.2) : `npm run test:coverage` s'exécute sur chaque push/PR vers `main` — mêmes 100 tests que `npm test` (le build échoue pareillement si l'un d'eux casse), plus le rapport de couverture, déposé en artefact `coverage-report` (HTML + JSON, 30 jours) consultable depuis l'onglet *Actions* du dépôt. Le résumé est aussi recopié dans `README.md` (§ Tests & couverture).

## 3. Couverture globale

Mesurée le 2026-07-17 avec `npm run test:coverage` (100 tests, 19 fichiers de test, tous verts).

| Dossier | % Instructions | % Branches | % Fonctions | % Lignes |
|---|---|---|---|---|
| **`src` (ensemble)** | **81.27 %** | 71.51 % | 58.89 % | **81.27 %** |
| `src/lib` | 100 % | 100 % | 100 % | 100 % |
| `src/constants` | 100 % | 100 % | 100 % | 100 % |
| `src/context` | 94.23 % | 100 % | 100 % | 94.23 % |
| `src/hooks` | 95.04 % | 78.57 % | 100 % | 95.04 % |
| `src/schemas` | 100 % | 75 % | 100 % | 100 % |
| `src/components` (écrans) | 85.91 % | 76.75 % | 29.87 % | 85.91 % |
| `src/components/ui` | 85.15 % | 80.95 % | 75.67 % | 85.15 % |
| `src/services` | 64.75 % | 47.96 % | 96.29 % | 64.75 % |
| `src/test` (helper `a11y.ts`) | 75 % | 66.66 % | 100 % | 75 % |
| `src` racine (`App.tsx`, `main.tsx`, `routes.ts`), `src/types` | 0 % | — | — | 0 % |

**Lecture** : le critère C2.2.2 (« majorité du code développé ») est désormais dépassé — **81 % des lignes de `src`** sont exercées par au moins un test. Tous les écrans (`MapView`, `CreatePost`, `PostDetail`, `MunicipalView`, `Profile`, `Settings`, `Layout`, `LoginPage`, `VoteDialog`, `PostCard`) ont maintenant des tests, chacun sous l'angle accessibilité (§5) — ce qui, en exerçant le rendu complet de chaque écran, a couvert la logique de rendu et les branches conditionnelles au passage. La colonne « % Fonctions » reste plus basse (58.89 %) : beaucoup de gestionnaires d'événements (`onSubmit`, `handleDelete`, `handleShare`…) ne sont pas déclenchés par un simple audit d'accessibilité, qui rend l'écran mais ne simule pas toutes les interactions. Ce qui reste à 0 % (`App.tsx`, `main.tsx`, `routes.ts`, `src/types`) est du câblage/bootstrap sans logique propre — voir §6.

## 4. Détail par fichier de test

### 4.1 `src/lib/postStatus.test.ts` (préexistant — 6 tests)
Teste `getNetVotes`, `getActualStatus` et `getStatusConfig` : le calcul du solde de votes, le seuil de bascule `pending → in-progress` (`VOTE_GOAL`), et le fait qu'un post `completed` ne redescend jamais. Intérêt : c'est la logique qui décide de l'état affiché sur chaque signalement — une erreur ici serait visible par tous les utilisateurs.

### 4.2 `src/schemas/formSchemas.test.ts` (préexistant — 8 tests)
Teste les schémas Zod de validation des formulaires (titre, description, adresse, email propriétaire…). Intérêt : c'est la première ligne de défense contre les données invalides envoyées à Supabase (POST-02 à POST-10 du cahier de recettes).

### 4.3 `src/components/ui/card.test.tsx` (préexistant — 3 tests)
Teste l'accessibilité clavier du composant `Card` (rôle `button`, `tabindex`, activation par `Entrée`/`Espace`). Intérêt : critère STR-06/STR-07 du cahier de recettes (navigation clavier, `aria-*`).

### 4.4 `src/lib/supabase.test.ts` (nouveau — 3 tests)
Teste `hasSupabaseConfig` et `getSupabaseClient()` : absence de config → client `null` ; **rejet d'une clé secrète/service-role** (`sb_secret_...`) même si une URL est fournie, avec avertissement console ; construction et mémoïsation du client quand la config est valide. Intérêt : couvre directement **SEC-01** du cahier de recettes — c'était la seule mesure de sécurité explicitement nommée dans la grille (OWASP) qui n'avait aucun test.

### 4.5 `src/services/authService.test.ts` (nouveau — 12 tests)
Teste chaque fonction du service d'authentification (`signUp`, `signIn`, `signOut`, `getCurrentUser`, `getUserProfile`, `updateUserProfile`) : cas de succès (bon appel à Supabase, bonne donnée renvoyée) et cas d'erreur (l'erreur Supabase est bien propagée via `throw`, pas avalée — sauf `AuthSessionMissingError` sur `getCurrentUser()`, qui résout `null`, cf. `PLAN_CORRECTION_BOGUES.md` BUG-15). Le client Supabase est mocké (`vi.mock('../lib/supabase')`) — aucun appel réseau réel. Intérêt : ce service est sur le chemin critique de toutes les pages protégées (AUTH-01 à AUTH-08).

### 4.6 `src/services/issuesService.test.ts` (nouveau — 12 tests)
Le fichier le plus volumineux du projet (711 lignes), testé sous trois angles :
- **Mode local (fallback sans Supabase configuré)** : `createIssue` → `listIssues` → `getIssueById` → `updateIssue` sur le store en mémoire, y compris le cas « signalement introuvable ». Ce mode est celui qui tourne si `.env` est absent — donc celui que verra un correcteur qui clone le repo sans configurer Supabase.
- **Mode Supabase (lectures)** : `listIssues`/`getIssueById` avec un faux client Supabase chaînable (`.from().select().eq()...`), y compris la vérification que `status: 'resolved'` (base) devient bien `status: 'completed'` (app) — le mapping `normalizeIssueStatus` — et la propagation d'une erreur base de données.
- **Commentaires / votes** : mapping correct des lignes `comments`/`votes` vers les types exposés à l'UI.
- **`deleteIssue`** (fonction Edge) : succès, et surtout le cas **suppression refusée** avec le message d'erreur du serveur propagé — couvre **SEC-02/SEC-03** du cahier de recettes (suppression par un non-propriétaire / sans authentification).

### 4.7 `src/hooks/useIssues.test.tsx` (nouveau — 7 tests)
Teste `useIssues`, `useIssue`, `useComments`, `useVotes` avec `renderHook` (`@testing-library/react`) et le service `issuesService` mocké : état `loading` initial puis résolu, erreur capturée sans crash, `reload()` qui refetch, ajout local d'un commentaire/vote après résolution de la promesse. Intérêt : ces hooks pilotent le chargement de données sur `MapView`, `PostDetail`, `MunicipalView` — une régression ici casserait l'affichage sur plusieurs écrans à la fois.

### 4.8 `src/context/UserContext.test.tsx` (nouveau — 5 tests)
Teste `UserProvider`/`useUser` : un utilisateur authentifié sans `user_metadata.role` est bien classé `citizen` par défaut ; un `role: 'municipal'` déclenche `isMunicipalUser: true` ; absence de session → `user: null` ; une erreur au chargement initial ne casse pas le rendu (`user: null` au lieu d'une exception) ; `useUser()` hors `UserProvider` lève bien l'erreur explicite. Intérêt : c'est ce contexte qui décide, avec le garde de route dans `Layout.tsx`, qui a accès à `/municipal` — donc directement lié à **STR-09/SEC-09** du cahier de recettes.

### 4.9 `src/test/a11y.ts` (helper, pas un fichier de test)
Encapsule `axe-core` : lance l'audit sur un conteneur DOM déjà rendu, filtré sur les tags WCAG 2.1 A/AA (base technique du RGAA — voir `ACCESSIBILITE.md` pour la justification du référentiel et le mapping), avec la règle `color-contrast` désactivée (non fiable sous `jsdom`, qui n'a pas de moteur de rendu réel). Exporte `expectNoA11yViolations(container)` (assertion, lève si violation) et `getA11yViolations(container)` (liste brute, pour les tests qui veulent inspecter le contenu d'une violation attendue).

### 4.10 `src/components/ui/card.test.tsx` — section RGAA ajoutée (+1 test)
En plus des tests clavier existants, un test `expectNoA11yViolations` sur une `Card` cliquable.

### 4.11 `src/components/ui/formControls.a11y.test.tsx` (nouveau — 8 tests)
Audite les primitives de formulaire dans un usage réaliste (pas isolées) : `Input`/`Textarea` associés à un `Label` via `htmlFor`/`id`, `RadioGroup` avec items labellisés, `Switch` labellisé, `Tabs` avec triggers nommés, `Button` icône-seule avec `aria-label`, `Badge` utilisé comme pastille de statut. Un test négatif délibéré (`Input` **sans** label) vérifie que le harnais détecte bien une vraie violation — pas seulement qu'il ne remonte jamais rien. Intérêt : ce sont les briques utilisées par tous les formulaires de l'app (`CreatePost`, `LoginPage`, `Settings`) ; un défaut ici se répercute partout.

### 4.12 `src/components/PostCard.test.tsx` (nouveau — 3 tests)
Audite le composant d'affichage d'un signalement dans trois configurations : standard, municipal + en cours + propriété privée (toutes les branches conditionnelles de rendu actives en même temps), et cliquable (rôle `button` hérité de `Card`). Intérêt : composant affiché en boucle sur la carte et dans la vue municipale — le plus vu par les utilisateurs.

### 4.13 `src/components/LoginPage.test.tsx` (nouveau — 3 tests)
Audite le formulaire de connexion, le formulaire d'inscription (champs Nom/Ville supplémentaires après bascule de mode), et l'état avec message d'erreur serveur affiché. `authService` est mocké. Intérêt : premier écran vu par tout utilisateur non connecté — les labels de formulaire (thématique RGAA 11) y sont critiques.

### 4.14 `src/components/Layout.test.tsx` (nouveau — 2 tests)
Audite la coquille de navigation (bandeau + nav basse) pour un compte citoyen et pour un compte municipal (bouton supplémentaire avec icône seule + `aria-label`). `useUser` est mocké. Intérêt : présente sur tous les écrans authentifiés — les landmarks (`header`/`main`/`nav`, thématique RGAA 12) n'ont besoin d'être corrects qu'une fois ici pour bénéficier à toute l'app.

### 4.15 `src/components/CreatePost.test.tsx` (nouveau — 5 tests)
Audite le formulaire le plus complexe de l'app (627 lignes) : état par défaut, branche « voie privée + non propriétaire » (révèle le champ email), branche « voie privée + propriétaire » (révèle l'upload de document), mode édition pré-rempli depuis un signalement existant, et l'état de chargement en mode édition. `useIssue` et `useUser` sont mockés. Intérêt : formulaire avec le plus de champs et de branches conditionnelles — chaque radio qui révèle une nouvelle section est un point où un label peut se perdre.

### 4.16 `src/components/PostDetail.test.tsx` (nouveau — 5 tests)
Audite les quatre branches de rendu (chargement, erreur, introuvable, chargé) plus une variante « signalement terminé, municipal, propriété privée » qui masque l'appel à voter. `useIssue`/`useComments`/`useVotes` et `useUser` sont mockés. **A débusqué un vrai défaut** : la barre de progression des tâches (`Progress`, Radix) n'avait pas de nom accessible — corrigé en §7.

### 4.17 `src/components/MunicipalView.test.tsx` (nouveau — 4 tests)
Audite le tableau de bord municipal : chargement, erreur, état vide (filtres de catégorie seuls), et liste de signalements répartis sur plusieurs catégories/statuts. `useIssues` est mocké.

### 4.18 `src/components/Profile.test.tsx` (nouveau — 4 tests)
Audite le profil citoyen : chargement, erreur, profil avec signalements, et variante « badge Mairie » (compte `cityWorker`). `useUser`, `useIssues` et `authService.getUserProfile` sont mockés.

### 4.19 `src/components/Settings.test.tsx` (nouveau — 2 tests)
Audite le formulaire de paramètres (informations personnelles + préférences `Switch`) une fois le profil chargé, et l'état de chargement. **A débusqué un vrai défaut** : le bouton de retour icône-seule n'avait pas de nom accessible — corrigé en §7.

### 4.20 `src/components/VoteDialog.test.tsx` (nouveau — 3 tests)
Audite la boîte de dialogue de vote (Radix `Dialog`, rendue dans un portail attaché à `document.body` — le scan cible donc `document.body`, pas le conteneur RTL) : branche « pour » avec niveau d'engagement, branche « contre » (section engagement masquée), et l'état fermé (rien ne doit être injecté dans le DOM ni violer quoi que ce soit).

### 4.21 `src/components/MapView.test.tsx` (nouveau — 4 tests)
Audite la carte interactive : chargement, erreur, vue par défaut (carte + liste de signalements, aucune sélection), et panneau de détail après sélection d'un signalement municipal/privé/en cours. `maplibre-gl` est entièrement mocké (`Map`/`Marker`/`NavigationControl` factices) — jsdom n'a pas de contexte WebGL, la vraie librairie planterait au montage. `useIssues`, `useVotes` et `useUser` sont mockés.

## 5. Accessibilité (RGAA)

Le référentiel choisi (RGAA 4.1), sa justification, la méthode (automatisé `axe-core` + manuel) et ses limites assumées (contraste non vérifiable sous `jsdom`) sont détaillés dans **`ACCESSIBILITE.md`**. Les tests correspondants sont listés en §4.9–4.21 ci-dessus et tournent avec le reste de la suite (`npm test`), pas dans une commande séparée. **Tous les écrans de l'application ont désormais un test d'accessibilité.**

## 6. Ce qui n'est volontairement pas couvert

- **`routes.ts`, `App.tsx`, `main.tsx`** : câblage/bootstrap, pas de logique à vérifier unitairement.
- **`src/components/ui/dialog.tsx` et `form.tsx`** : couverts indirectement via `VoteDialog`/`CreatePost`/`Settings`, pas de test dédié à la primitive elle-même.
- **Interactions non déclenchées par un audit d'accessibilité** : soumission de formulaire (`onSubmit`), suppression (`handleDelete`), partage (`handleShare`), géolocalisation (`handleLocateUser`)… Ces tests rendent l'écran et auditent le DOM obtenu, mais ne cliquent pas sur tous les boutons d'action — d'où le % Fonctions plus bas que le % Lignes dans le tableau du §3. Une passe de tests **fonctionnels** (pas seulement accessibilité) sur ces écrans resterait à faire si on veut aussi verrouiller leur comportement contre les régressions.
- **Contraste des couleurs** : cf. `ACCESSIBILITE.md` §3 — nécessite un vrai navigateur, pas de solution fiable en test unitaire jsdom.

## 7. Défauts d'accessibilité réels trouvés et corrigés au passage

Écrire les tests a immédiatement fait remonter deux violations réelles (pas des faux positifs de configuration) :

1. **`PostDetail.tsx`** — la barre de progression des tâches (`<Progress>`, `role="progressbar"` via Radix) n'avait aucun nom accessible (`aria-progressbar-name`, sévérité *serious*). Corrigé par `aria-label="Progression des tâches"` sur cet unique usage.
2. **`Settings.tsx`** — le bouton de retour vers `/profile` ne contenait qu'une icône (`ArrowLeft`), sans texte ni `aria-label` (`button-name`, sévérité *critical* — un bouton totalement muet pour un lecteur d'écran). Corrigé par `aria-label="Retour au profil"`.

Ces deux corrections illustrent l'intérêt d'un audit automatisé exécuté à chaque run de test plutôt qu'une revue ponctuelle : ce sont des régressions qui auraient pu se réintroduire silencieusement sans que rien ne les signale.
