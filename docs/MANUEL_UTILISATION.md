# Manuel d'utilisation — City Spot

## 1. Objet du document

Ce manuel explique comment utiliser City Spot du point de vue d'un utilisateur final : citoyen ou agent municipal. Il répond au critère C2.4.1 de la grille d'évaluation, volet *« manuel d'utilisation »*.

Pour l'installation et le déploiement technique, voir [`MANUEL_DEPLOIEMENT.md`](./MANUEL_DEPLOIEMENT.md). Pour faire évoluer le logiciel, voir [`MANUEL_MISE_A_JOUR.md`](./MANUEL_MISE_A_JOUR.md).

## 2. Présentation

City Spot permet à des citoyens de signaler des dégradations sur la voie publique (nid-de-poule, éclairage défectueux, mobilier urbain cassé…), de voter pour soutenir les signalements des autres, et de suivre leur traitement. Les agents municipaux disposent d'une vue dédiée pour piloter l'ensemble des signalements de leur ville.

Deux types de comptes existent :

| Rôle | Ce qu'il voit en plus |
|---|---|
| **Citoyen** | Carte, création/édition/suppression de ses propres signalements, vote, commentaires, profil, paramètres |
| **Agent municipal** | Tout ce qu'un citoyen voit, + un bouton "Vue municipale" (icône bâtiment, en haut à gauche) donnant accès au tableau de bord `/municipal` |

Un compte est municipal ou non selon la colonne `role` de `public.users` en base — voir §7 de ce document ou `MANUEL_MISE_A_JOUR.md` pour l'attribution du rôle.

## 3. Créer un compte / se connecter

Sur l'écran `/login` :

1. Mode **"S'inscrire"** : renseigner nom, ville, email et mot de passe, puis valider. Le compte est créé avec le rôle `citizen` par défaut.
2. Mode **"Se connecter"** : email + mot de passe d'un compte existant.

Une session valide redirige automatiquement vers la carte (`/`). Sans session, toute route de l'application redirige vers `/login`.

## 4. Signaler une dégradation

Depuis n'importe quel écran, le bouton **"Nouveau"** (icône `+`, barre de navigation basse) ouvre le formulaire de création (`/create`) :

1. **Photo** — une image de la dégradation (PNG/JPG, 5 Mo max).
2. **Titre** et **description** de la dégradation.
3. **Localisation** — adresse ou lieu précis.
4. **Type de voie** :
   - *Voie publique* — cas standard.
   - *Voie privée* — un sous-formulaire apparaît :
     - si le signalant est le propriétaire, il peut joindre un document de propriété (PDF/JPG/PNG, 5 Mo max) ;
     - sinon, l'email du propriétaire est demandé — il sera notifié du signalement.
5. **Tâches à effectuer** et **matériel nécessaire** — listes libres, ajoutées une par une (bouton "Ajouter" ou touche Entrée).

Valider crée le signalement et renvoie vers la carte. Le signalement démarre au statut *"en attente de votes"*.

## 5. Explorer la carte

L'écran d'accueil (`/`) affiche la carte des signalements (fond OpenStreetMap) et leur liste. Cliquer sur un marqueur ou une carte de la liste ouvre le détail du signalement (`/post/:id`).

## 6. Le détail d'un signalement

Sur `/post/:id` :

- **Statut** — badge en haut à droite : *en attente*, *en cours*, ou *terminé*. Un signalement porté par la mairie porte en plus un badge "Projet Mairie".
- **Voter** — tant que le statut est *en attente*, le bouton "Voter pour ce projet" ouvre une boîte de dialogue :
  - voter *pour* ou *contre* ;
  - en cas de vote positif, choisir un niveau d'engagement (proposition simple, s'engager, prendre le lead — informatif, n'affecte pas le comptage).
  - Un compte ne peut voter qu'une seule fois par signalement. La jauge affiche le nombre de votes nets (pour − contre) par rapport à l'objectif requis pour faire passer le projet *en cours*. Un bouton "Votants" liste qui a voté et dans quel sens.
- **Tâches** — visibles et cochables uniquement une fois le projet passé *en cours*, et uniquement par le créateur du signalement. Une barre de progression indique l'avancement.
- **Matériel nécessaire** — liste informative, non modifiable après création (sauf via "Modifier", §6.1).
- **Commentaires** — tout utilisateur connecté peut lire et publier un commentaire.
- **Partager** — copie le lien du signalement (ou ouvre le partage natif du système sur mobile).

### 6.1 Modifier ou supprimer son propre signalement

Les icônes crayon (modifier) et corbeille (supprimer) n'apparaissent que pour le créateur du signalement, en haut de l'écran de détail.

- **Modifier** ouvre le même formulaire qu'à la création, pré-rempli (`/create/:id`), et enregistre les changements sur "Enregistrer les modifications".
- **Supprimer** demande une confirmation avant suppression définitive.

Ces actions sont également vérifiées côté serveur : un utilisateur qui n'est pas le créateur ne peut ni modifier ni supprimer un signalement, même en contournant l'interface (cf. `CAHIER_DE_RECETTES.md`, section Sécurité).

## 7. Vue municipale (agents municipaux uniquement)

Accessible via le bouton bâtiment en haut de l'écran, ou directement sur `/municipal`. Un compte non municipal qui tente d'y accéder est redirigé vers la carte avec un message d'erreur.

La vue propose :

- des **statistiques** globales (total, en vote, en cours, terminés) ;
- un **filtre par catégorie** (Voirie, Éclairage, Sécurité, Propreté, Espaces verts, Mobilier urbain) ;
- des **onglets** par statut (Tous / En vote / En cours / Terminés), chaque signalement menant à son détail (§6).

## 8. Profil et paramètres

- **Profil** (`/profile`) — informations du compte connecté et badge "Mairie" si le compte est municipal.
- **Paramètres** (`/settings`, accessible depuis le profil) :
  - nom, téléphone, adresse (l'email n'est pas modifiable ici — géré par l'authentification) ;
  - préférences : notifications par email, visibilité du profil ;
  - "Enregistrer les modifications" persiste les changements ; ils sont rechargés à chaque connexion.
  - "Se déconnecter" termine la session et renvoie vers `/login`.

## 9. Accessibilité

L'application vise le RGAA 4.1 (navigation clavier complète, labels de formulaire, structure sémantique). Détail du référentiel et de sa couverture : [`ACCESSIBILITE.md`](./ACCESSIBILITE.md).

## 10. Problèmes fréquents

| Symptôme | Cause / solution |
|---|---|
| Upload d'image ou de document refusé | Fichier > 5 Mo, ou type non autorisé (image : PNG/JPG ; document : PDF/JPG/PNG). |
| "Vous avez déjà voté pour ce projet" | Un seul vote par compte et par signalement, non modifiable. |
| Bouton "Vue municipale" absent | Le compte connecté n'a pas le rôle municipal (voir §2) — s'adresser à un administrateur. |
| Tâches non cochables | Le projet est encore *en attente de votes*, ou le compte connecté n'est pas le créateur du signalement. |
| Boutons Modifier/Supprimer absents sur un signalement | Seul le créateur du signalement les voit. |
