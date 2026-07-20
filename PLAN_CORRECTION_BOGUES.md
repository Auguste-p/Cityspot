# Plan de correction des bogues — City Spot

## 1. Objet du document

Ce document recense les bogues détectés sur City Spot, leur qualification (sévérité, origine, impact), et l'analyse des points d'amélioration pour chaque test en échec du `CAHIER_DE_RECETTES.md`. Il répond au critère C2.3.2 de la grille d'évaluation :
- *« Les bogues de codes sont détectés, qualifiés et traités »*
- *« Une analyse des points d'amélioration est réalisée pour chaque test en échec »*
- *« Les corrections et les améliorations proposées sont conformes à l'attendu et garantissent le bon fonctionnement du logiciel »*

Chaque entrée précise : comment le bogue a été détecté, sa cause racine, le correctif (appliqué ou proposé), et comment le vérifier. Les bogues déjà corrigés référencent le scénario du cahier de recettes qui prouve la correction ; les bogues ouverts référencent le scénario qui a servi à les détecter.

## 2. Légende

- **Sévérité** — **Critique** : faille de sécurité ou perte de données exploitable · **Majeur** : fonctionnalité annoncée mais non opérante · **Mineur** : accessibilité, ergonomie, incohérence sans impact fonctionnel
- **Statut** — ✅ Corrigé et vérifié · 🟡 Ouvert, correctif proposé ci-dessous · ⚪ Ouvert, décision produit requise avant correctif

---

## 3. Bogues corrigés durant cette session

### BUG-01 — `/municipal` accessible par n'importe quel compte citoyen
- **Sévérité** : Critique (contrôle d'accès manquant sur une vue destinée aux agents municipaux)
- **Détecté par** : exécution de MUN-02 / SEC-09 (`CAHIER_DE_RECETTES.md`) — navigateur piloté, compte citoyen, navigation directe vers `/municipal`
- **Cause racine** : `Layout.tsx` masquait uniquement le bouton de navigation vers `/municipal` selon `isMunicipalUser`, sans jamais vérifier le rôle au niveau de la route elle-même. Un utilisateur tapant l'URL directement contournait donc entièrement le contrôle.
- **Correctif appliqué** : garde de route ajoutée dans le `useEffect` de `Layout.tsx` — redirection vers `/` avec toast `"Accès réservé aux comptes municipaux"` dès qu'un utilisateur non municipal atteint une route commençant par `/municipal`.
- **Vérification** : MUN-02 / SEC-09 ré-exécutés après correctif → ✅ OK (redirection confirmée).
- **Statut** : ✅ Corrigé et vérifié (2026-07-17)

### BUG-02 — Suppression d'un signalement systématiquement en erreur (`"supabaseUrl is required"`)
- **Sévérité** : Majeur (fonctionnalité de suppression totalement inopérante)
- **Détecté par** : remontée utilisateur ("j'ai un toast supabaseUrl is required")
- **Cause racine** : la fonction Edge `supabase/functions/delete-issue/index.ts` lisait `Deno.env.get('VITE_SUPABASE_URL')` — une convention propre au bundling client Vite, jamais injectée dans le runtime des Edge Functions. Les variables réellement disponibles côté serveur sont `SUPABASE_URL` / `SUPABASE_ANON_KEY` (réservées, auto-injectées par la plateforme).
- **Correctif appliqué** : remplacement par `Deno.env.get('SUPABASE_URL')` / `Deno.env.get('SUPABASE_ANON_KEY')`, puis redéploiement de la fonction.
- **Vérification** : SEC-02 (suppression par un non-propriétaire → 403) et SEC-03 (suppression sans authentification → 401) exécutés avec succès après correctif.
- **Statut** : ✅ Corrigé et vérifié (2026-07-17)

### BUG-03 — Formulaire Paramètres ne sauvegarde rien
- **Sévérité** : Majeur (fonctionnalité annoncée — "Enregistrer les modifications" — mais entièrement factice)
- **Détecté par** : revue de code pendant la rédaction du cahier de recettes — `onSubmit` dans `Settings.tsx` se limitait à `console.log(data)` + un toast de succès, sans aucun appel à Supabase.
- **Cause racine** : la table `public.users` ne portait initialement que `name`/`city`/`cityWorker` ; les champs `phone`, `address`, `avatar` et les préférences n'avaient pas de colonne de destination, et personne n'avait câblé l'appel de sauvegarde.
- **Correctif appliqué** : migration ajoutant les colonnes manquantes, fonction `updateUserProfile()` dans `authService.ts`, `Settings.tsx` charge désormais le profil existant au montage (`getUserProfile`) et persiste réellement à la soumission.
- **Vérification** : SET-01 exécuté — modification, rechargement de page, valeurs conservées.
- **Statut** : ✅ Corrigé et vérifié (2026-07-17)

### BUG-04 — Bouton "Modifier" un signalement sans aucune action
- **Sévérité** : Majeur (fonctionnalité visible dans l'UI, non implémentée)
- **Détecté par** : revue de code — le bouton dans `PostDetail.tsx` n'avait pas de gestionnaire `onClick`.
- **Cause racine** : fonctionnalité jamais terminée lors du développement initial du composant.
- **Correctif appliqué** : `CreatePost.tsx` réutilisé en mode édition via la route `/create/:id` (préremplissage du formulaire, garde de propriété, appel à `updateIssue` au lieu de `createIssue`) ; le bouton navigue désormais vers cette route.
- **Vérification** : DET-14 (édition réussie par le créateur) et DET-15 (garde côté client pour un non-créateur) exécutés avec succès.
- **Statut** : ✅ Corrigé et vérifié (2026-07-17)

### BUG-05 — Bouton de suppression exposé sur la carte sans aucune vérification
- **Sévérité** : Critique (n'importe quel utilisateur pouvait supprimer n'importe quel signalement depuis le panneau de la carte, aucune vérification de propriétaire, pas de confirmation)
- **Détecté par** : demande explicite de revue du flux de suppression
- **Cause racine** : le bouton "Supprimer le signalement" dans `MapView.tsx` appelait `deleteIssue(selectedPost.id)` sans condition d'affichage ni confirmation.
- **Correctif appliqué** : bouton retiré de `MapView.tsx` ; suppression relocalisée sur `/post/:id`, visible uniquement si `user?.id === post.created_by`, avec confirmation `window.confirm`.
- **Vérification** : DET-09 (icônes visibles seulement pour le créateur), DET-12/DET-13 (suppression confirmée / annulée), MAP-08 (bouton absent de la carte), SEC-02 (recours serveur si contournement de l'UI).
- **Statut** : ✅ Corrigé et vérifié (2026-07-17)

### BUG-06 — Une saisie en cours est effacée sans prévenir (Paramètres, édition de signalement, Profil)
- **Sévérité** : Majeur (perte de données utilisateur, intermittente donc difficile à diagnostiquer)
- **Détecté par** : remontée utilisateur ("je ne peux pas modifier les préférences mail, notifications push et mail et profil visible")
- **Cause racine** : un `useEffect` de chargement de profil dépendait de l'objet `user` entier (`}, [user])`) plutôt que de `user?.id`. Or `user` reçoit une nouvelle référence à chaque événement d'authentification (rafraîchissement de session, session initiale), ce qui relançait le fetch et un `form.reset()` en plein milieu d'une interaction, écrasant silencieusement ce que l'utilisateur venait de modifier. Le même schéma existait dans trois composants (`Settings.tsx`, `CreatePost.tsx` en mode édition, `Profile.tsx`).
- **Correctif appliqué** : dépendance changée en `user?.id` (primitif stable) dans les trois composants ; `Settings.tsx` et `CreatePost.tsx` n'affichent plus le formulaire tant que le chargement initial n'est pas résolu, supprimant toute fenêtre d'interaction avant le premier `reset()`.
- **Vérification** : SET-07 et DET-16 exécutés — aucune régression observée après le correctif.
- **Statut** : ✅ Corrigé et vérifié (2026-07-17)

### BUG-07 — Barre de progression des tâches sans nom accessible
- **Sévérité** : Mineur (accessibilité, sévérité *serious* selon axe-core)
- **Détecté par** : test automatisé `PostDetail.test.tsx` (`expectNoA11yViolations`, cf. `ACCESSIBILITE.md`)
- **Cause racine** : le composant `<Progress>` (Radix, `role="progressbar"`) n'avait pas de libellé.
- **Correctif appliqué** : ajout de `aria-label="Progression des tâches"`.
- **Vérification** : le test d'accessibilité correspondant passe.
- **Statut** : ✅ Corrigé et vérifié

### BUG-08 — Bouton retour de Paramètres totalement muet pour un lecteur d'écran
- **Sévérité** : Mineur (accessibilité, sévérité *critical* selon axe-core — bouton sans aucun contenu textuel ni `aria-label`)
- **Détecté par** : test automatisé `Settings.test.tsx`
- **Cause racine** : bouton icône-seule (`ArrowLeft`) sans texte ni attribut d'accessibilité.
- **Correctif appliqué** : ajout de `aria-label="Retour au profil"`.
- **Vérification** : le test d'accessibilité correspondant passe.
- **Statut** : ✅ Corrigé et vérifié

### BUG-09 — Double vote possible en contournant l'interface (SEC-05)
- **Sévérité** : Critique (intégrité des données de vote, mécanisme central de l'application)
- **Détecté par** : SEC-05, sonde REST directe exécutée le 2026-07-17 — deux `INSERT` identiques (`id_user`, `id_issue`) sur la table `votes` acceptés tous les deux (HTTP 201)
- **Cause racine** : le blocage `hasVoted` dans `PostDetail.tsx`/`MapView.tsx` n'existe que côté client (il relit la liste des votes déjà chargée et masque le bouton). La table `votes` n'avait aucune contrainte d'unicité, donc rien n'empêchait un appel direct à l'API REST d'insérer un second vote pour le même couple utilisateur/signalement.
- **Correctif appliqué** : migration `20260717010000_add_votes_unique_constraint.sql` — nettoyage des doublons existants (dont ceux insérés par la sonde SEC-05 elle-même) puis `unique (id_user, id_issue)` sur `public.votes`.
- **Vérification** : sonde REST rejouée après la migration — le second `INSERT` échoue désormais avec `HTTP 409 / 23505 duplicate key value violates unique constraint "votes_unique_user_issue"`. Sanity check : un utilisateur peut toujours voter une première fois normalement (HTTP 201).
- **Statut** : ✅ Corrigé et vérifié (2026-07-17)

### BUG-10 — Modification arbitraire d'un signalement en contournant l'interface (SEC-10)
- **Sévérité** : Critique (n'importe quel compte authentifié pouvait modifier le contenu de n'importe quel signalement)
- **Détecté par** : SEC-10, sonde REST directe exécutée le 2026-07-17 — un `PATCH` direct sur la table `issues` (en contournant `updateIssue` et sa vérification `created_by`) accepté sans erreur (HTTP 200)
- **Cause racine** : la garde `existingPost.created_by !== user.id` dans `CreatePost.tsx` (cf. BUG-04/DET-15) protège le parcours normal via l'UI, mais `issues` n'avait aucune Row Level Security — en réalité une policy `"all for all"` héritée de la phase de mise en place initiale de la table (créée pour faciliter les tests, jamais retirée), qui autorisait tout accès à tout utilisateur authentifié. Une première tentative de correctif ajoutant une policy restrictive sans retirer l'ancienne n'avait aucun effet : les policies RLS Postgres se combinent en OR, la plus permissive l'emporte toujours.
- **Correctif appliqué** : la policy `"all for all"` a été retirée manuellement, puis la migration `20260717020000_add_issues_rls.sql` a activé la RLS sur `issues` avec des policies scindées par opération : lecture ouverte à tout utilisateur connecté, création/modification/suppression réservées au créateur (`auth.uid() = created_by`).
- **Vérification** : sonde REST rejouée après correctif — le `PATCH` par un non-propriétaire est désormais bloqué (HTTP 200 mais **0 ligne modifiée**, comportement standard de PostgREST sous RLS : la ligne existe mais ne matche la policy pour aucun utilisateur autre que son créateur). Sanity checks : le créateur peut toujours modifier son propre signalement, la carte et le détail continuent de s'afficher normalement.
- **Statut** : ✅ Corrigé et vérifié (2026-07-17)

### BUG-11 — L'email du propriétaire (voie privée) n'est jamais enregistré
- **Sévérité** : Majeur (fonctionnalité affichée dans le formulaire et dans le détail du signalement, mais qui ne fait rien)
- **Détecté par** : revue de code lors de la rédaction du cahier de recettes
- **Cause racine** : le formulaire `CreatePost.tsx` capture bien `ownerEmail`, et `PostDetail.tsx` sait l'afficher (`post.ownerEmail`), mais ni `createIssue` ni `updateIssue` (`issuesService.ts`) ne l'envoyaient à la base ; `normalizeIssue` ne le lisait pas non plus depuis la ligne Supabase. Le champ existait dans le formulaire mais la valeur partait dans le vide.
- **Correctif appliqué** : migration `20260717040000_add_issues_owner_email.sql` (colonne `owner_email`), `CreateIssueInput`/`UpdateIssueInput` transmettent désormais `ownerEmail`, `normalizeIssue` le relit depuis la ligne, `CreatePost.tsx` le passe à `createIssue`/`updateIssue`.
- **Vérification** : création d'un signalement voie privée/pas propriétaire avec un email → affiché immédiatement, **toujours affiché après un rechargement complet de page** (preuve d'une vraie persistance en base, pas juste un état local), et conservé après un cycle d'édition complet.
- **Statut** : ✅ Corrigé et vérifié (2026-07-17)

### BUG-12 — Statut "municipal" porté par deux champs indépendants et non synchronisés
- **Sévérité** : Mineur (incohérence de données possible, pas d'impact de sécurité — `role` reste le seul champ qui contrôle l'accès à `/municipal`)
- **Détecté par** : revue de code (`STR-09` du cahier de recettes)
- **Cause racine** : `user_metadata.role` (sur `auth.users`) contrôlait l'accès à `/municipal` ; `public.users.cityWorker` contrôlait séparément l'affichage du badge "Mairie" sur `/profile`. Un compte pouvait avoir l'un sans l'autre — pas un problème de sécurité (chaque champ ne gouvernait que son propre usage), mais une expérience potentiellement incohérente.
- **Décision produit** : Option A retenue (des deux proposées) — source de vérité unique.
- **Correctif appliqué, en deux temps** :
  1. Première passe : migration `20260717060000_drop_users_city_worker.sql` (colonne `cityWorker` retirée), `Profile.tsx` dérive le badge de `isMunicipalUser` — mais `isMunicipalUser` lisait encore `auth.users.user_metadata.role` à ce stade.
  2. **Corrigé** : le projet ne doit pas écrire dans `auth.users` (contrainte posée par le propriétaire du projet). La source de vérité a donc été déplacée entièrement dans `public.users`, table sur laquelle l'app a la main : migration `20260717070000_add_users_role.sql` (colonne `role text default 'citizen'`), `UserContext.tsx` interroge désormais `public.users.role` (fonction `fetchRole`) au lieu de `user_metadata.role` pour construire `isMunicipalUser`. `Layout.tsx` (garde de route) et `Profile.tsx` (badge) consomment tous deux ce même `isMunicipalUser` — une seule requête, une seule source.
- **Vérification** : avec deux comptes réels, l'un mis à `role = 'municipal'` dans `public.users`, l'autre laissé `citizen` — le compte municipal a le bouton "Vue municipale", l'accès direct à `/municipal`, et le badge "Mairie" sur son profil (confirmé par capture d'écran) ; le compte citoyen n'a aucun des trois. Badge et accès dérivent bien de la même donnée, plus de désync possible par construction.
- **Statut** : ✅ Corrigé et vérifié (2026-07-17)

### BUG-13 — Même défaut que BUG-10 sur `tasks`, `materials`, `comments`, `votes`
- **Sévérité** : Critique (mêmes conséquences que BUG-10, sur les tables satellites d'un signalement)
- **Détecté par** : en investiguant BUG-10, le propriétaire du projet a identifié que les tables `tasks`, `materials`, `comments` et `votes` portaient la même policy `"all for all"` héritée de la mise en place initiale — jamais couverte par une sonde dédiée du cahier de recettes, mais logiquement exposée au même défaut.
- **Cause racine** : identique à BUG-10 — policies permissives de test jamais retirées, aucune restriction par propriétaire.
- **Correctif appliqué** : migration `20260717030000_add_tasks_materials_comments_votes_rls.sql` — suppression dynamique de toutes les policies existantes sur ces 4 tables (`DO $$ ... $$`, sans avoir besoin de connaître leur nom exact), puis policies scindées par table :
  - `tasks`/`materials` (pas de `created_by` propre) : lecture ouverte, écriture (insert/delete) réservée au créateur du signalement parent, vérifié par sous-requête sur `issues.created_by`.
  - `comments`/`votes` (colonne `id_user` propre) : lecture ouverte, insertion uniquement en tant que soi-même (`auth.uid() = id_user`) ; pas de policy update/delete, l'app n'ayant aucune fonctionnalité d'édition/suppression pour ces deux tables — reste bloqué par défaut, comportement voulu.
- **Vérification** : sondes REST rejouées après correctif —
  - `tasks`/`materials` : un non-créateur ne peut ni insérer (`403`) ni supprimer (`0` ligne affectée) une tâche/un matériau sur un signalement qui n'est pas le sien ; la lecture reste ouverte (`200`).
  - `comments`/`votes` : un utilisateur ne peut pas poster en usurpant l'identité d'un autre (`id_user` différent du token authentifié → `403`), mais peut toujours agir en tant que lui-même (`201`).
  - Sanity check de bout en bout : le flux d'édition complet d'un signalement (`updateIssue`, qui supprime puis réinsère les tâches/matériel) fonctionne toujours pour son créateur.
- **Statut** : ✅ Corrigé et vérifié (2026-07-17)

### BUG-14 — L'édition d'un signalement affiche toujours la mauvaise branche "propriétaire"
- **Sévérité** : Majeur (perte silencieuse possible du champ email du propriétaire en réédition)
- **Détecté par** : vérification manuelle de BUG-11 — en rouvrant en édition un signalement "voie privée, pas propriétaire", le formulaire affichait la branche "propriétaire" (upload de document) au lieu de la branche email, cachant le champ censé contenir la valeur qu'on venait de vérifier.
- **Cause racine** : `isOwnProperty` n'était jamais persisté en base (aucune colonne), et le `useEffect` de préremplissage de `CreatePost.tsx` en mode édition mettait la valeur en dur à `'yes'` plutôt que de la déduire des données existantes. La valeur du champ email survivait par chance (React Hook Form conserve par défaut la valeur d'un champ démonté), mais toute interaction sur ce radio en réédition l'aurait fait disparaître silencieusement.
- **Correctif appliqué** : migration `20260717050000_add_issues_is_own_property.sql` (colonne `is_own_property`), `CreateIssueInput`/`UpdateIssueInput` transmettent désormais `isOwnProperty`, `normalizeIssue` le relit, et le préremplissage en mode édition utilise `existingPost.isOwnProperty === false ? 'no' : 'yes'` (repli sur `'yes'` pour les lignes historiques sans valeur, comportement identique à avant pour elles).
- **Vérification** : pour un signalement "pas propriétaire", réouvrir en édition affiche désormais le bon radio ("Non") et le bon champ (email, préchargé avec la bonne valeur) ; pour un signalement "propriétaire", le radio "Oui" et la section document s'affichent correctement. Les deux cas survivent à une resoumission sans perte.
- **Statut** : ✅ Corrigé et vérifié (2026-07-17)

### BUG-15 — Faux positifs Sentry : `AuthSessionMissingError` à chaque visite anonyme de `/login`
- **Sévérité** : Mineur (aucun impact utilisateur — la page fonctionne normalement — mais pollue le suivi d'erreurs et masque de vrais incidents dans le bruit)
- **Détecté par** Sentry (mise en place cette session) : 3 alertes email reçues en production avec la stack `authService → supabase.auth.getUser() → AuthSessionMissingError`
- **Cause racine** : `LoginPage.tsx` appelle `getCurrentUser()` (`authService.ts`) dans un `useEffect` au montage, sans `.catch()`, pour rediriger un utilisateur déjà connecté. Or l'API Supabase `auth.getUser()` ne renvoie pas `{ user: null, error: null }` en l'absence de session — elle renvoie une erreur nommée `AuthSessionMissingError`. `getCurrentUser()` la relançait comme n'importe quelle autre erreur (`if (error) throw error`), ce qui produisait une promesse rejetée non interceptée à chaque visite de `/login` par un visiteur non authentifié — le cas normal, pas un cas d'erreur.
- **Correctif appliqué** : `getCurrentUser()` (`authService.ts`) intercepte spécifiquement `error?.name === 'AuthSessionMissingError'` et renvoie `null` (comportement identique à "aucun utilisateur connecté"), avant le `if (error) throw error` général qui reste inchangé pour les vraies erreurs (réseau, etc.).
- **Vérification** : tests unitaires ajoutés dans `authService.test.ts` — `getCurrentUser()` résout `null` (et ne rejette pas) quand Supabase renvoie `AuthSessionMissingError`, et continue de rejeter sur une autre erreur (ex. réseau). Suite complète rejouée (`npx vitest run src/services/authService.test.ts`) → 14/14 passants.
- **Statut** : ✅ Corrigé et vérifié (2026-07-19)

### BUG-16 — Carte quasi invisible en layout étroit (mobile et desktop)
- **Sévérité** : Majeur (fonctionnalité centrale — la carte — rendue inutilisable dans une grande partie des cas d'usage réels)
- **Détecté par** : remontée utilisateur ("la carte est à peine visible") avec capture d'écran, confirmé ensuite en layout desktop étroit
- **Cause racine (à trois niveaux, trouvés successivement)** :
  1. Le panneau de liste des signalements n'avait aucune contrainte de hauteur en layout mobile (`flex-col`) : sa hauteur de contenu (tous les signalements listés) dépassait l'écran et écrasait la carte au lieu de défiler.
  2. Une fois ce premier point corrigé, la chaîne `h-full` sur plusieurs `<div>` imbriqués à l'intérieur d'un item flex ne se résolvait pas de façon fiable (dépendance circulaire entre la hauteur du parent et celle de l'enfant).
  3. Une fois passé en positionnement `absolute inset-0`, MapLibre reclasse lui-même son conteneur avec sa propre classe `maplibregl-map`, qui impose `position: relative` dans sa feuille de style embarquée — écrasant silencieusement le `position: absolute` posé dessus par l'application, à cause de l'ordre de cascade CSS.
- **Correctif appliqué** : panneau de liste passé en `flex-1` (mobile) pour partager l'espace au lieu de le monopoliser ; une classe CSS écrite à la main (`.cityspot-details-panel`) gère le retour à une largeur fixe sur desktop (le projet n'a pas de build Tailwind actif — `src/index.css` est un export statique qui ne contient que les classes déjà utilisées à sa génération, donc certaines variantes comme `lg:flex-none` n'existent tout simplement pas et ne peuvent pas être ajoutées via une classe Tailwind ordinaire) ; le conteneur passé à MapLibre utilise désormais `h-full w-full` plutôt que `absolute inset-0`, en s'appuyant sur son parent direct (non reclassé par la librairie) qui porte lui le positionnement absolu.
- **Vérification** : diagnostic fait via l'inspecteur du navigateur (dimensions réelles de chaque élément de la chaîne), confirmé visuellement par l'utilisateur en mobile et en desktop après chaque correctif intermédiaire.
- **Statut** : ✅ Corrigé et vérifié (2026-07-20)

### BUG-17 — Redirection silencieuse vers `/login` après une inscription réussie
- **Sévérité** : Majeur (un nouvel utilisateur ne comprend pas pourquoi il "n'arrive pas" à s'inscrire, alors que son compte est bien créé)
- **Détecté par** : remontée utilisateur, confirmé par inspection de la requête réseau `auth/v1/signup`
- **Cause racine** : le projet Supabase exige la confirmation de l'email avant l'ouverture d'une session (champ `confirmation_sent_at` présent dans la réponse, absence du champ `session`). Le code appelait systématiquement `navigate('/')` après `signUp()`, sans vérifier qu'une session avait effectivement été ouverte — `Layout.tsx` (garde de route) renvoyait alors vers `/login` sans aucun message, laissant croire à un échec silencieux de l'inscription.
- **Correctif appliqué** : `LoginPage.tsx` vérifie désormais si `signUp()` renvoie une session ; si non, affiche *"Compte créé ! Vérifiez votre boîte mail pour confirmer votre inscription, puis connectez-vous."* et repasse en mode connexion, au lieu de naviguer vers `/`.
- **Vérification** : tests unitaires ajoutés (`LoginPage.test.tsx`) couvrant les deux cas (session présente / absente après inscription).
- **Statut** : ✅ Corrigé et vérifié (2026-07-20)

### BUG-18 — Coordonnées de la ville jamais enregistrées en base (silencieusement)
- **Sévérité** : Majeur (fonctionnalité annoncée — centrage automatique de la carte sur la ville de l'utilisateur — totalement inopérante, sans aucune erreur visible)
- **Détecté par** : remontée utilisateur ("la ville est bien affichée mais la caméra n'est pas centrée dessus")
- **Cause racine** : `cityLat`/`cityLng` étaient enregistrés via un appel `.update()` déclenché côté client juste après `signUp()` — un appel qui a besoin d'une session active pour passer la Row Level Security ("un utilisateur ne modifie que sa propre fiche"). Or ce projet exige la confirmation par email (BUG-17) : il n'existe donc aucune session à ce moment précis. L'appel échouait silencieusement (RLS filtre la ligne cible, `HTTP 200`, 0 ligne modifiée, pas d'erreur renvoyée) — contrairement à `name`/`city`, qui eux passent par le trigger `handle_new_user`, exécuté côté serveur indépendamment de toute session client, et fonctionnaient donc normalement. L'incohérence entre les deux mécanismes masquait le problème.
- **Correctif appliqué** : `cityLat`/`cityLng` passent désormais par `user_metadata`, exactement comme `name`/`city`, et le trigger `handle_new_user()` insère les cinq champs en un seul `INSERT` (migration `20260720140000_handle_new_user_city_coords.sql`). L'appel `.update()` séparé, devenu inutile, a été retiré.
- **Vérification** : `authService.test.ts` mis à jour pour vérifier que `cityLat`/`cityLng` sont bien transmis dans `user_metadata` au moment de l'appel `auth.signUp()`.
- **Statut** : ✅ Corrigé et vérifié (2026-07-20)

---

## 4. Synthèse

| Sévérité | Corrigés | Ouverts |
|---|---|---|
| Critique | 5 (BUG-01, BUG-05, BUG-09, BUG-10, BUG-13) | 0 |
| Majeur | 9 (BUG-02, BUG-03, BUG-04, BUG-06, BUG-11, BUG-14, BUG-16, BUG-17, BUG-18) | 0 |
| Mineur | 4 (BUG-07, BUG-08, BUG-12, BUG-15) | 0 |
| **Total** | **18** | **0** |

Les 18 bogues identifiés sont tous corrigés et re-vérifiés — par sonde REST directe pour les bogues de sécurité, par un parcours de bout en bout dans un navigateur piloté pour les bogues fonctionnels (BUG-11, BUG-14 : création, rechargement complet depuis la base, cycle d'édition), par les tests d'accessibilité automatisés pour BUG-07/BUG-08, par Sentry en production pour BUG-15 (détecté via le monitoring d'erreurs plutôt que par revue de code ou remontée utilisateur), et par inspection directe du navigateur pour BUG-16 (dimensions réelles à chaque niveau de la mise en page). BUG-12 attendait une décision produit (Option A retenue : source de vérité unique) avant de recevoir son correctif. **Aucun bogue ouvert à ce jour.**
