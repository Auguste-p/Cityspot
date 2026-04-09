
  # City Spot App

  This is a code bundle for City Improvement Photo App. The original project is available at https://www.figma.com/design/XktHdCVAyIvYDDu09QAoAN/City-Improvement-Photo-App.

  ## Running the code

  Run `npm i` to install the dependencies.

  Run `npm run dev` to start the development server.
  
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