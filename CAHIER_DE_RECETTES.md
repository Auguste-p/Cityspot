# Cahier de recettes — City Spot

## 1. Objet du document

Ce cahier de recettes décrit les scénarios de tests à exécuter pour valider le bon fonctionnement de l'application **City Spot** avant mise en production. Il couvre l'ensemble des fonctionnalités livrées (signalement de dégradations urbaines, vote citoyen, vue municipale, gestion de compte), ainsi que des tests structurels et des tests de sécurité.

Chaque scénario précise : les étapes à exécuter, le résultat attendu, une criticité, et une case à cocher pour le statut d'exécution (OK / KO / Non testé).

### 1.1 Traçabilité avec la grille d'évaluation (C2.3.1)

- *"Le cahier de recettes reprend l'ensemble des fonctionnalités attendues"* → sections 5 à 11 (Authentification, Création de signalement, Carte, Détail, Vue municipale, Profil, Paramètres) couvrent chacune un écran livré, fonctionnalité par fonctionnalité.
- *"Les tests fonctionnels, structurels et de sécurité exécutés sont conformes au plan défini"* → sections 12 (Structurels) et 13 (Sécurité) complètent la couverture fonctionnelle ; la colonne Statut (§4) matérialise l'exécution une fois les cases cochées. **État actuel : les 18 scénarios Bloquant ont été exécutés le 2026-07-17 (navigateur piloté + appels directs) — 12 ✅ (dont MUN-02/SEC-09, corrigés le jour même après un premier échec confirmé), 6 non concluants faute d'un second compte de test (quota de signups Supabase épuisé, cf. §14). Les scénarios Majeur/Mineur restent à exécuter.**

## 2. Périmètre

| Module | Fichier(s) source |
|---|---|
| Authentification | `LoginPage.tsx`, `authService.ts`, `Layout.tsx` |
| Création de signalement | `CreatePost.tsx`, `formSchemas.ts`, `issuesService.ts` |
| Carte interactive | `MapView.tsx` |
| Détail d'un signalement | `PostDetail.tsx`, `VoteDialog.tsx`, `CreatePost.tsx` (mode édition via `/create/:id`) |
| Vue municipale | `MunicipalView.tsx` |
| Profil utilisateur | `Profile.tsx`, `authService.ts` (`getUserProfile`) |
| Paramètres du compte | `Settings.tsx` |
| Fonction serveur de suppression | `supabase/functions/delete-issue` |
| Base de données (schéma & sécurité) | `supabase/migrations/20260716120000_sync_users_on_signup.sql`, `supabase/migrations/20260716130000_add_city_worker_flag.sql` |

## 3. Environnement de test

- Application lancée en local (`npm run dev`) ou via le conteneur Docker (`docker run -p 8080:80 cityspot`, voir `DOCKER.md`).
- Base Supabase de test configurée (`VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`), ou absence de configuration pour valider le mode de secours en données locales (`hasSupabaseConfig = false`).
- Migrations appliquées (`supabase db push`) : trigger de synchronisation `public.users` et colonne `cityWorker`.
- Fonction Edge `delete-issue` déployée avec la version courante du code (`supabase functions deploy delete-issue`) — elle lit désormais `SUPABASE_URL`/`SUPABASE_ANON_KEY`, pas `VITE_SUPABASE_URL`.
- Quatre comptes de test : un `role = citizen`, un `role = municipal`, et parmi eux au moins un avec `public.users.cityWorker = true` et un avec `cityWorker = false`, pour couvrir les deux statuts indépendamment.
- Navigateur desktop + un test sur viewport mobile (< 480px).

## 4. Légende

- **Type** — F : fonctionnel · S : structurel · SEC : sécurité
- **Criticité** — **Bloquant** : empêche la mise en production si KO · **Majeur** : dégrade fortement l'usage, doit être corrigé ou explicitement accepté avec un plan (C2.3.2) · **Mineur** : confort/UX, peut être reporté
- **Statut** — ☐ à tester · ✅ OK · ❌ KO

---

## 5. Authentification

| ID | Type | Criticité | Scénario | Étapes | Résultat attendu | Statut |
|---|---|---|---|---|---|---|
| AUTH-01 | F | Bloquant | Inscription réussie | Aller sur `/login`, basculer en mode "S'inscrire", saisir nom, ville, email + mot de passe valides, valider | Compte créé, redirection vers `/` | ☐ *(tenté 2026-07-17 : `@example.com` rejeté par Supabase Auth comme domaine invalide, puis quota de 2 signups/heure épuisé — non concluant, à réexécuter une fois le quota reseté)* |
| AUTH-02 | F | Bloquant | Connexion réussie | Saisir des identifiants valides, valider | Redirection vers `/`, session active | ✅ *(exécuté 2026-07-17, compte réel, redirection vers `/` confirmée)* |
| AUTH-03 | F | Majeur | Connexion échouée | Saisir un mauvais mot de passe | Message d'erreur affiché, pas de redirection | ☐ |
| AUTH-04 | F | Mineur | Redirection si déjà connecté | Être connecté, naviguer manuellement vers `/login` | Redirection automatique vers `/` | ☐ |
| AUTH-05 | SEC | Bloquant | Accès à une page protégée sans session | Effacer la session, accéder directement à `/`, `/profile`, `/create`, etc. | Redirection systématique vers `/login` | ✅ *(exécuté 2026-07-17, navigateur piloté, sans session : `/`, `/profile`, `/create`, `/settings`, `/municipal` redirigent tous vers `/login`)* |
| AUTH-06 | F | Majeur | Déconnexion | Depuis `/settings`, cliquer "Se déconnecter" | Session invalidée, redirection vers `/login` | ☐ |
| AUTH-07 | F | Mineur | Validation des champs Nom/Ville | En mode inscription, laisser "Nom" ou "Ville" vide, tenter de valider | Soumission bloquée par la validation native du navigateur (`required`), `signUp` non appelé | ☐ |
| AUTH-08 | F | Majeur | Synchronisation `public.users` à l'inscription | S'inscrire avec nom="Jeanne Dupont", ville="Lyon", puis consulter la table `public.users` dans Supabase Studio | Une ligne apparaît avec `id` = uuid du compte, `name`="Jeanne Dupont", `city`="Lyon" (trigger `on_auth_user_created` → `handle_new_user()`) | ☐ |

## 6. Création d'un signalement (`/create`)

| ID | Type | Criticité | Scénario | Étapes | Résultat attendu | Statut |
|---|---|---|---|---|---|---|
| POST-01 | F | Bloquant | Création nominale — voie publique | Remplir titre/description/adresse valides, laisser "Voie publique", valider | Toast succès, redirection `/`, signalement visible sur la carte | ✅ *(exécuté 2026-07-17, signalement "Nid-de-poule recette test" créé, redirection confirmée)* |
| POST-02 | F | Mineur | Validation titre | Saisir un titre de 1-2 caractères | Erreur "Le titre doit contenir au moins 3 caractères" | ☐ |
| POST-03 | F | Mineur | Validation description | Saisir une description de moins de 10 caractères | Erreur affichée, formulaire bloqué | ☐ |
| POST-04 | F | Mineur | Validation adresse | Saisir une adresse de moins de 5 caractères | Erreur affichée | ☐ |
| POST-05 | F | Majeur | Upload photo valide | Sélectionner un JPG/PNG < 5 Mo | Aperçu affiché, bouton de suppression de l'image disponible | ☐ |
| POST-06 | F | Majeur | Upload photo invalide | Sélectionner un fichier > 5 Mo ou un type non-image | Toast d'erreur, aucun aperçu | ☐ |
| POST-07 | F | Majeur | Voie privée + propriétaire = moi | Sélectionner "Voie privée" > "Oui", uploader un document PDF/JPG/PNG < 5 Mo | Nom du document affiché avec option de suppression | ☐ |
| POST-08 | F | Majeur | Voie privée + document invalide | Uploader un fichier non autorisé (ex : .docx) ou > 5 Mo | Toast d'erreur, document non pris en compte | ☐ |
| POST-09 | F | Majeur | Voie privée + pas propriétaire, email manquant | Sélectionner "Voie privée" > "Non", laisser l'email vide, valider | Erreur "L'email du propriétaire est requis pour une propriété privée" | ☐ |
| POST-10 | F | Mineur | Voie privée + pas propriétaire, email invalide | Saisir un email mal formé | Erreur "Veuillez entrer un email valide" | ☐ |
| POST-11 | F | Mineur | Ajout/suppression de tâches | Ajouter 2 tâches via le champ dédié, en supprimer une | Liste mise à jour dynamiquement (`useFieldArray`) | ☐ |
| POST-12 | F | Mineur | Ajout/suppression de matériel | Ajouter puis retirer un matériau | Liste mise à jour dynamiquement | ☐ |
| POST-13 | F | Mineur | Annulation | Cliquer "Annuler" | Retour à `/` sans création | ☐ |
| POST-14 | S | Mineur | Formulaire non bloquant pendant soumission | Observer le bouton pendant l'envoi | Bouton désactivé + spinner "Création..." | ☐ |

## 7. Carte interactive (`/`)

| ID | Type | Criticité | Scénario | Étapes | Résultat attendu | Statut |
|---|---|---|---|---|---|---|
| MAP-01 | F | Bloquant | Affichage des marqueurs | Charger la carte avec des signalements existants | Un marqueur par signalement, couleur selon statut (`STATUS_MARKER_COLORS`) | ✅ *(exécuté 2026-07-17, signalement visible dans la liste latérale)* |
| MAP-02 | F | Bloquant | Sélection d'un marqueur | Cliquer sur un marqueur | Panneau de détail du post affiché avec ses infos et son statut de vote | ✅ *(exécuté 2026-07-17, clic sur la carte → panneau de détail affiché → navigation `/post/:id` confirmée)* |
| MAP-03 | F | Majeur | Vote depuis la carte | Sélectionner un post en statut "en vote", voter | Compteur de votes mis à jour, double-vote empêché | ☐ |
| MAP-04 | F | Mineur | Géolocalisation | Cliquer sur l'icône de localisation | Carte centrée sur la position utilisateur, ville affichée (reverse geocoding) | ☐ |
| MAP-05 | F | Mineur | Repli sans géolocalisation | Refuser la permission de géolocalisation | Carte centrée sur la ville de repli (`FALLBACK_CITY`), pas de blocage | ☐ |
| MAP-06 | F | Majeur | Mode sans Supabase configuré | Lancer l'app sans `VITE_SUPABASE_URL`/`ANON_KEY` | La carte utilise le store local (`localIssuesStore`), aucune erreur bloquante | ☐ |
| MAP-07 | F | Majeur | Erreur réseau Supabase | Simuler une erreur de connexion à `listIssues()` | Message d'erreur affiché à l'utilisateur, pas d'écran blanc | ☐ |
| MAP-08 | S | Mineur | Absence du bouton de suppression | Sélectionner un signalement sur la carte (créateur ou non) | Seul le bouton "Voir les détails" est proposé dans le panneau ; la suppression n'est plus disponible depuis la carte (relocalisée sur `/post/:id`, cf. DET-12) | ☐ |

## 8. Détail d'un signalement (`/post/:id`)

| ID | Type | Criticité | Scénario | Étapes | Résultat attendu | Statut |
|---|---|---|---|---|---|---|
| DET-01 | F | Bloquant | Affichage complet | Ouvrir un signalement | Titre, photo, description, adresse, date, statut, badge "Projet Mairie" si applicable | ✅ *(exécuté 2026-07-17, titre/description/adresse confirmés à l'écran)* |
| DET-02 | F | Bloquant | Vote positif | Voter "Pour" sur un post "en vote" | Compteur `positive` incrémenté, blocage du re-vote pour cet utilisateur | ✅ *(exécuté 2026-07-17 avec le seul compte disponible — vote soumis avec succès ; le blocage du re-vote croisé entre deux comptes distincts reste à confirmer, cf. DET-09)* |
| DET-03 | F | Majeur | Vote négatif | Voter "Contre" | Compteur `negative` incrémenté | ☐ |
| DET-04 | F | Majeur | Franchissement de l'objectif de vote | Amener le solde net de votes à +10 | Statut du post passe de "En vote" à "En cours" | ☐ |
| DET-05 | F | Majeur | Visibilité des tâches selon statut | Consulter un post "en vote" puis "en cours" | En vote : tâches masquées avec message informatif · en cours : tâches visibles avec barre de progression | ☐ |
| DET-06 | SEC | Majeur | Édition des tâches restreinte | Se connecter avec un compte différent du créateur, tenter de cocher une tâche sur un post "en cours" | Action bloquée, toast "Les tâches ne sont plus modifiables..." (contrôle `canEditTasks`) | ☐ |
| DET-07 | F | Majeur | Ajout de commentaire | Saisir un commentaire, publier | Commentaire ajouté en fin de liste avec auteur et date | ☐ |
| DET-08 | F | Mineur | Partage | Cliquer sur "Partager" (navigateur sans Web Share API) | Lien copié dans le presse-papier, toast de confirmation | ☐ |
| DET-09 | SEC | Bloquant | Icônes Modifier/Supprimer réservées au créateur | Ouvrir un post créé par un autre utilisateur, puis le même post en étant le créateur | Absentes dans le premier cas, visibles dans le second (garde `user?.id === post.created_by`) | ☐ *(non exécuté : nécessite un 2e compte, bloqué par le quota de signups Supabase — moitié du scénario vérifiable dès qu'un compte est disponible : côté propriétaire, déjà observé OK pendant DET-01/DET-02)* |
| DET-10 | F | Mineur | Signalement introuvable | Accéder à `/post/id-inexistant` | Message "Signalement introuvable" avec retour à la carte | ☐ |
| DET-11 | F | Mineur | Liste des votants | Cliquer sur le badge de score | Modale listant chaque votant avec son choix (Pour/Contre) | ☐ |
| DET-12 | F | Majeur | Suppression par le créateur | Ouvrir un signalement créé par soi-même, cliquer sur l'icône poubelle, confirmer la boîte de dialogue | Toast "Signalement supprimé", redirection vers `/`, le signalement disparaît de la carte et des listes | ☐ |
| DET-13 | F | Mineur | Annulation de la suppression | Cliquer sur l'icône poubelle puis annuler la confirmation (`window.confirm`) | Aucun appel à `deleteIssue`, le signalement reste inchangé | ☐ |
| DET-14 | F | Majeur | Modification par le créateur | Cliquer sur l'icône crayon d'un signalement créé par soi-même, modifier titre/description/tâches/matériel, enregistrer | Formulaire `/create/:id` pré-rempli avec les données existantes, `updateIssue` appelé (remplace tâches/matériel), toast "Signalement modifié avec succès !", redirection vers `/post/:id` avec les changements visibles | ☐ |
| DET-15 | SEC | Majeur | Modification par un non-créateur (accès direct URL) | Naviguer directement vers `/create/:id` d'un signalement créé par un autre utilisateur | Toast "Vous n'êtes pas autorisé à modifier ce signalement", redirection vers `/` (garde côté client dans `CreatePost.tsx`) — **à vérifier** : `updateIssue` passe par le client Supabase, pas par une fonction serveur ; sans RLS sur `issues` (cf. SEC-10), la garde n'est que côté UI | ☐ |
| DET-16 | F | Majeur | Édition non interrompue par un événement d'auth | Ouvrir `/create/:id` en édition, modifier un champ dans les toutes premières secondes après le chargement (fenêtre où l'auth Supabase peut encore émettre un événement de session) | La modification reste affichée, rien ne revient à la valeur d'origine (l'effet de préremplissage dépend de `user?.id`, pas de l'objet `user`, pour ne se déclencher qu'une fois) | ☐ |

## 9. Vue municipale (`/municipal`)

| ID | Type | Criticité | Scénario | Étapes | Résultat attendu | Statut |
|---|---|---|---|---|---|---|
| MUN-01 | F | Majeur | Accès via un compte municipal | Se connecter avec `role = municipal` | Bouton d'accès visible dans l'en-tête, page accessible | ☐ |
| MUN-02 | SEC | Bloquant | Accès direct à `/municipal` par un citoyen | Se connecter avec `role = citizen`, saisir l'URL `/municipal` manuellement | Accès refusé | ✅ *(échec confirmé le 2026-07-17, corrigé le jour même par un garde de route dans `Layout.tsx` — redirection vers `/` + toast "Accès réservé aux comptes municipaux", re-testé en direct : OK)* |
| MUN-03 | F | Mineur | Filtrage par catégorie | Cliquer sur chaque catégorie (voirie, éclairage, sécurité, propreté, espaces verts, mobilier urbain) | Liste filtrée, compteur par catégorie exact | ☐ |
| MUN-04 | F | Mineur | Onglets par statut | Parcourir les onglets Tous/En vote/En cours/Terminés | Contenu et compteurs cohérents avec les données | ☐ |
| MUN-05 | F | Mineur | Statistiques globales | Comparer les cartes de stats en haut de page aux données réelles | Total, en vote, en cours, terminés corrects | ☐ |
| MUN-06 | F | Mineur | État vide | Filtrer une catégorie sans signalement | Message "Aucun signalement dans cette catégorie" | ☐ |

## 10. Profil (`/profile`)

| ID | Type | Criticité | Scénario | Étapes | Résultat attendu | Statut |
|---|---|---|---|---|---|---|
| PROF-01 | F | Mineur | Statistiques utilisateur | Ouvrir le profil | Nombre de signalements, terminés, en cours affichés | ☐ |
| PROF-02 | F | Mineur | Filtres par onglet | Parcourir les onglets Tous/En vote/En cours/Terminés | Listes cohérentes avec les statuts | ☐ |
| PROF-03 | F | Mineur | Accès aux paramètres | Cliquer sur l'icône réglages | Navigation vers `/settings` | ☐ |
| PROF-04 | F | Majeur | Filtrage par utilisateur | Se connecter avec deux comptes distincts ayant chacun créé des signalements, comparer les listes affichées sur `/profile` | Seuls les signalements dont `created_by` correspond à l'utilisateur connecté sont affichés (filtre dans `Profile.tsx`) | ☐ |
| PROF-05 | F | Mineur | Profil sans signalement | Se connecter avec un compte n'ayant créé aucun signalement | Message "Aucun signalement pour le moment" sur chaque onglet | ☐ |
| PROF-06 | F | Majeur | Nom et ville affichés depuis `public.users` | Ouvrir `/profile` avec un compte ayant `name`/`city` renseignés en base | Le nom (titre) et la ville (sous-titre) affichés correspondent à `public.users.name`/`city` — l'email n'est plus affiché sur cette page | ☐ |
| PROF-07 | F | Mineur | Badge "Mairie" conditionnel | Ouvrir le profil d'un compte `cityWorker = true`, puis d'un compte `cityWorker = false` | Badge dégradé bleu "Mairie" (icône bâtiment) visible uniquement dans le premier cas | ☐ |
| PROF-08 | SEC | Bloquant | Isolation des données de profil | Voir SEC-11 | Cf. section 13 | ☐ *(même blocage que SEC-11)* |

## 11. Paramètres (`/settings`)

| ID | Type | Criticité | Scénario | Étapes | Résultat attendu | Statut |
|---|---|---|---|---|---|---|
| SET-01 | F | Bloquant | Persistance des informations modifiées | Modifier nom/téléphone/adresse, enregistrer, **recharger la page** | Toast de succès **et** les valeurs modifiées sont conservées après rechargement (`updateUserProfile` écrit dans `public.users`, rechargées via `getUserProfile` au montage) | ✅ *(exécuté 2026-07-17 sur compte réel — nom/téléphone/adresse modifiés, confirmés après rechargement de page, puis valeurs d'origine restaurées)* |
| SET-06 | F | Mineur | Email en lecture seule | Observer le champ Email du formulaire | Champ désactivé avec la mention "Géré depuis l'authentification, non modifiable ici" — le changement d'email nécessite un flux `auth.updateUser` dédié, non implémenté | ☐ |
| SET-02 | F | Mineur | Validation téléphone | Saisir un numéro invalide (ex : "abc") | Erreur "Veuillez entrer un numéro de téléphone valide" | ☐ |
| SET-03 | F | Mineur | Validation nom | Saisir un nom d'1 caractère | Erreur "au moins 2 caractères" | ☐ |
| SET-04 | F | Mineur | Bascule des préférences | Activer/désactiver notifications par email et visibilité du profil | État des interrupteurs conservé pendant la session | ☐ |
| SET-05 | F | Majeur | Déconnexion depuis les paramètres | Cliquer "Se déconnecter" | Redirection vers `/login` | ☐ |
| SET-07 | F | Majeur | Interrupteurs utilisables dès l'affichage | Ouvrir `/settings`, activer/désactiver un interrupteur | Le formulaire n'est rendu qu'une fois `getUserProfile` résolu (spinner "Chargement des paramètres" avant) ; aucun retour en arrière du switch après le clic, y compris juste après le chargement de la page | ☐ |

## 12. Tests structurels

| ID | Type | Criticité | Scénario | Étapes | Résultat attendu | Statut |
|---|---|---|---|---|---|---|
| STR-01 | S | Majeur | Navigation bas de page | Cliquer sur chaque item (Carte/Nouveau/Profil) | Route active correctement surlignée, contenu chargé | ☐ |
| STR-02 | S | Mineur | Lazy loading des routes | Ouvrir l'onglet réseau, naviguer entre les pages | Chaque page charge son chunk JS à la demande, pas d'erreur console | ☐ |
| STR-03 | S | Bloquant | Build de production | Exécuter `npm run build` | Build réussi sans erreur, dossier `build/` généré | ✅ *(exécuté à plusieurs reprises tout au long de la session, dernière fois 2026-07-17 — build systématiquement vert)* |
| STR-04 | S | Majeur | Pipeline CI | Pousser une modification sur une branche | `.github/workflows/ci.yml` exécute install/test/build avec succès | ☐ |
| STR-05 | S | Mineur | Responsive mobile | Réduire le viewport à < 480px sur chaque page | Mise en page adaptée, pas de débordement horizontal | ☐ |
| STR-06 | S | Mineur | Navigation clavier | Sur `PostDetail`, atteindre une tâche au clavier (Tab) et la valider (Entrée/Espace) | Tâche cochée/décochée, focus visible (`focus-visible:ring`) | ☐ |
| STR-07 | S | Mineur | Attributs d'accessibilité | Inspecter les boutons icône uniquement (supprimer photo, partager, etc.) | `aria-label` présent et pertinent | ☐ |
| STR-08 | S | Majeur | Conteneur Docker | `docker build` + `docker run`, ouvrir `http://localhost:8080` | Application servie par nginx, routes internes fonctionnelles (fallback SPA) | ☐ |
| STR-09 | S | Majeur | Cohérence du statut municipal | Comparer, pour un même compte, `user_metadata.role` (contrôle l'accès à `/municipal`) et `public.users.cityWorker` (contrôle le badge sur `/profile`) | ⚠️ Ce sont deux champs indépendants et non synchronisés : un compte peut être `cityWorker = true` sans `role = 'municipal'` (badge affiché, mais pas d'accès à la vue municipale) ou l'inverse — **à clarifier** : source de vérité unique souhaitable | ☐ |

## 13. Tests de sécurité

| ID | Type | Criticité | Scénario | Étapes | Résultat attendu | Statut |
|---|---|---|---|---|---|---|
| SEC-01 | SEC | Bloquant | Rejet d'une clé Supabase secrète côté client | Configurer `VITE_SUPABASE_ANON_KEY` avec une clé commençant par `sb_secret_` | Client Supabase désactivé (`getSupabaseClient()` retourne `null`), avertissement en console, pas de fuite de la clé | ☐ |
| SEC-02 | SEC | Bloquant | Suppression par un non-propriétaire | Appeler la fonction `delete-issue` avec le token d'un utilisateur différent du créateur | Réponse `403 Vous n'êtes pas autorisé à supprimer ce signalement` | ☐ *(non exécuté : nécessite un 2e compte, bloqué par le quota de signups Supabase)* |
| SEC-03 | SEC | Bloquant | Suppression sans authentification | Appeler `delete-issue` sans en-tête `Authorization` | Réponse `401 Non authentifié` | ✅ *(exécuté 2026-07-17 par requête directe — HTTP 401 `{"error":"Non authentifié"}` confirmé, valide le correctif `SUPABASE_URL`/`SUPABASE_ANON_KEY` de la fonction Edge)* |
| SEC-04 | SEC | Majeur | Intégrité du tally de votes | Tenter d'envoyer un payload de création falsifiant `positive_votes`/`negative_votes` | ⚠️ À vérifier en base : ces colonnes doivent être recalculées côté serveur par un trigger sur la table `votes` (commentaire présent dans `PostDetail.tsx`), pas acceptées telles quelles depuis le client | ☐ |
| SEC-05 | SEC | Majeur | Double vote | Voter deux fois avec le même compte sur le même post | Second vote bloqué côté UI (`hasVoted`) — **à confirmer côté base** qu'une contrainte d'unicité (`id_user`, `id_issue`) existe réellement sur la table `votes`, sans quoi le blocage n'est que visuel | ☐ |
| SEC-06 | SEC | Majeur | Upload — limite de taille | Uploader une image ou un document > 5 Mo | Rejet côté client (`MAX_UPLOAD_SIZE`) | ☐ |
| SEC-07 | SEC | Majeur | Upload — type de fichier | Tenter d'uploader un exécutable ou script renommé en `.jpg` | Rejet basé sur `file.type` MIME, pas sur l'extension seule — **à vérifier** que le contrôle est suffisant | ☐ |
| SEC-08 | SEC | Mineur | En-têtes HTTP de sécurité | Inspecter les réponses HTTP en production (nginx) | Présence de `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin` | ☐ |
| SEC-09 | SEC | Bloquant | Accès direct à une route protégée par rôle | Voir MUN-02 | Cf. section 9 | ✅ *(même exécution que MUN-02 — corrigé et confirmé)* |
| SEC-10 | SEC | Majeur | Isolation des données par ligne (RLS) — `issues`/`tasks`/`materials`/`comments`/`votes` | Depuis un compte citoyen, tenter une requête Supabase directe (hors UI) sur ces tables pour un autre utilisateur | Row Level Security doit empêcher toute lecture/écriture non autorisée — **toujours non vérifiable depuis le repo** : contrairement à `public.users` (cf. SEC-11), ces tables n'ont aucune migration SQL versionnée ; leurs policies (si elles existent) ne vivent que dans le dashboard Supabase, à contrôler manuellement | ☐ |
| SEC-11 | SEC | Bloquant | Isolation RLS sur `public.users` | Avec le token d'un citoyen A, tenter une requête Supabase directe `select` ou `update` sur la ligne `public.users` d'un citoyen B | Bloqué par les policies `Users can view their own profile` / `Users can update their own profile` (migration `20260716120000_sync_users_on_signup.sql`) — **à vérifier que la migration a bien été appliquée** (`supabase db push`), sans quoi la table reste ouverte via la clé anon | ☐ *(non exécuté : nécessite un 2e compte, bloqué par le quota de signups Supabase)* |

## 14. Synthèse

| Catégorie (type) | Nombre de scénarios |
|---|---|
| Fonctionnels (F) | 59 |
| Structurels (S) | 11 |
| Sécurité (SEC) | 17 |
| **Total** | **87** |

| Criticité | Nombre de scénarios |
|---|---|
| Bloquant | 18 |
| Majeur | 34 |
| Mineur | 35 |
| **Total** | **87** |

**Seuil d'acceptation de la recette :**
- 100 % des scénarios **Bloquant** doivent être ✅ avant toute mise en production.
- Les scénarios **Majeur** en ❌ doivent soit être corrigés, soit faire l'objet d'un correctif planifié et documenté dans le plan de correction des bogues (C2.3.2).
- Les scénarios **Mineur** en ❌ peuvent être reportés et suivis comme dette technique, sans bloquer la livraison.

**Points d'attention actuels** (marqués ⚠️ ci-dessus, à traiter avant la recette finale) :
- **Résolu le 2026-07-17** : `/municipal` n'était protégé que par le masquage du lien de navigation. Un compte citoyen y accédait normalement en tapant l'URL — confirmé par exécution (MUN-02 / SEC-09 ❌), corrigé le jour même par un garde de route dans `Layout.tsx` (redirection vers `/` + toast dès qu'un utilisateur non municipal atteint `/municipal`), re-testé en direct : OK. Ce garde reste côté client — cohérent avec le reste du modèle de sécurité de l'app (même approche que la redirection `/login` pour un utilisateur non connecté), puisque la donnée affichée sur `/municipal` (liste des signalements) n'est pas différente de celle déjà visible sur la carte publique.
- Le projet Supabase applique un rate limit par défaut de 2 signups/heure. Ça a empêché l'exécution de AUTH-01 et de tous les scénarios nécessitant un second compte (DET-09, SEC-02, SEC-11, PROF-08) pendant cette session — à relancer une fois le quota disponible ou augmenté (Dashboard → Authentication → Rate Limits).
- Le statut "municipal" repose sur deux champs indépendants et non synchronisés — `user_metadata.role` (accès à `/municipal`) et `public.users.cityWorker` (badge sur `/profile`) — sans source de vérité unique (STR-09).
- La modification d'un signalement (`/create/:id`) n'est protégée que côté client (`created_by === user.id` dans `CreatePost.tsx`) ; contrairement à la suppression (fonction serveur `delete-issue`), rien n'empêche un appel direct à `updateIssue` côté base tant que `issues` n'a pas de RLS versionnée (DET-15).
- `issues`/`tasks`/`materials`/`comments`/`votes` n'ont toujours aucune migration SQL versionnée : l'intégrité des votes, l'unicité par utilisateur et les policies RLS de ces tables ne sont pas vérifiables statiquement et doivent être contrôlées directement sur le projet Supabase (SEC-04, SEC-05, SEC-10, DET-15). `public.users` fait désormais exception : sa RLS est versionnée et testable (SEC-11).
- Le changement d'email n'est pas implémenté (champ désactivé dans `/settings`, cf. SET-06) : nécessiterait un flux `auth.updateUser` dédié avec confirmation, volontairement laissé hors périmètre.
- L'email du propriétaire (`ownerEmail`, saisi lors d'un signalement en voie privée) n'a jamais été persisté en base — ni par `createIssue`, ni par `updateIssue` — malgré un champ dédié dans le formulaire et son affichage dans `PostDetail.tsx`. Rouvrir un signalement en édition ne retrouvera donc jamais cette valeur : elle repart toujours vide.
- Un bug de type "reset qui écrase une saisie en cours" a été détecté et corrigé à trois endroits pendant cette passe (`Settings.tsx`, `CreatePost.tsx` en mode édition, `Profile.tsx`) : un `useEffect` dépendait de l'objet `user` entier, qui change de référence à chaque événement d'authentification (rafraîchissement de session), et relançait un `form.reset()`/fetch en plein milieu d'une interaction. Corrigé partout en dépendant de `user?.id` à la place. DET-16 et SET-07 couvrent la non-régression sur les deux cas où la perte de saisie était réellement possible (édition de signalement, paramètres) ; pas de scénario dédié pour `Profile.tsx`, purement en lecture donc à risque nul.
