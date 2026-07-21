# Accessibilité — City Spot

## 1. Objet du document

Ce document présente et justifie le référentiel d'accessibilité choisi pour City Spot, la méthode utilisée pour le vérifier, et son état de couverture actuel. Il répond au critère C2.2.3 de la grille d'évaluation :
- *« Le référentiel d'accessibilité choisi est présenté et justifié (ex : RGAA, OPQUAST, etc.) »*
- *« Le prototype permet de répondre aux exigences du référentiel d'accessibilité préalablement établi »*

## 2. Référentiel choisi : RGAA 4.1

Le **RGAA (Référentiel Général d'Amélioration de l'Accessibilité)**, version 4.1, a été retenu plutôt qu'OPQUAST.

**Justification** :
- City Spot expose une **vue municipale** (`/municipal`) destinée à des agents de collectivité et sert au signalement de dégradations sur la voie publique — le RGAA est le référentiel opposable aux services publics et collectivités en France (obligation légale au titre de l'article 47 de la loi du 11 février 2005), ce qui en fait la référence la plus pertinente pour une application à vocation municipale, même si City Spot n'est pas elle-même un service public.
- Le RGAA s'appuie techniquement sur les **WCAG 2.1, niveaux A et AA** — les mêmes règles qu'OPQUAST recoupe partiellement mais de façon moins structurée pour de l'audit automatisé. Utiliser directement les tags WCAG permet de s'outiller avec `axe-core`, qui connaît nativement ces niveaux.

## 3. Méthode

Deux niveaux de vérification, complémentaires :

| Niveau | Outil | Portée |
|---|---|---|
| **Automatisé** | `axe-core` (moteur utilisé par axe DevTools / Lighthouse), exécuté dans les tests Vitest sur les composants rendus (jsdom + `@testing-library/react`) | Détecte statiquement ~30-40 % des critères RGAA : labels de formulaire, rôles ARIA, structure des landmarks, textes alternatifs présents, attributs invalides |
| **Manuel** | Navigation clavier, lecteur d'écran, inspection visuelle | Ordre de tabulation réel, pertinence sémantique des textes alternatifs, contraste des couleurs — déjà en partie couvert par les scénarios **STR-06** (navigation clavier) et **STR-07** (attributs `aria-label`) du `CAHIER_DE_RECETTES.md` |

Le mapping RGAA → tags `axe-core` et la raison de la limite ci-dessous vivent dans `src/test/a11y.ts` (helper `expectNoA11yViolations` / `getA11yViolations`, réutilisé par tous les tests d'accessibilité).

**Limite assumée** : la règle `color-contrast` d'axe-core est désactivée dans le helper. Sous `jsdom` il n'y a pas de moteur de rendu réel (pas de layout, pas de résolution des couleurs CSS calculées), donc cette règle produit des résultats non fiables en test unitaire. Le contraste (thématique RGAA n°3 « Couleurs ») doit être vérifié dans un vrai navigateur (Lighthouse ou l'extension axe DevTools) — non automatisé pour l'instant.

## 4. Ce qui est vérifié automatiquement aujourd'hui

**Tous les écrans de l'application ont un test d'accessibilité.**

| Composant / écran | Fichier de test | Thématiques RGAA couvertes |
|---|---|---|
| `Card` (générique + cliquable) | `src/components/ui/card.test.tsx` | 7 (Scripts) — rôle/`tabindex` d'un élément rendu interactif |
| `Input`, `Textarea`, `Label`, `RadioGroup`, `Switch`, `Tabs`, `Button` (icône), `Badge` | `src/components/ui/formControls.a11y.test.tsx` | 11 (Formulaires) — association label/champ ; 7 (Scripts) — nommage accessible des contrôles ARIA (Radix) |
| `PostCard` (public/municipal/privé, cliquable) | `src/components/PostCard.test.tsx` | 1 (Images) — texte alternatif ; 9 (Structure) — hiérarchie des titres |
| `LoginPage` (connexion, inscription, erreur affichée) | `src/components/LoginPage.test.tsx` | 11 (Formulaires) — labels, message d'erreur perceptible ; 9 (Structure) |
| `Layout` (bandeau + navigation, compte citoyen et municipal) | `src/components/Layout.test.tsx` | 12 (Navigation) — landmarks `header`/`main`/`nav` ; 7 (Scripts) — `aria-label` du bouton municipal (icône seule) |
| `CreatePost` (création, branches voie privée, mode édition) | `src/components/CreatePost.test.tsx` | 11 (Formulaires) — labels sur formulaire complexe multi-branches ; 1 (Images) |
| `PostDetail` (chargement/erreur/introuvable/chargé, tâches, votes, commentaires) | `src/components/PostDetail.test.tsx` | 11 ; 1 ; 9 — a révélé un défaut réel (§7 de `TESTS.md`) |
| `MunicipalView` (filtres, onglets, liste multi-catégories) | `src/components/MunicipalView.test.tsx` | 12 (Navigation) — onglets ; 9 (Structure) |
| `Profile` (chargement/erreur, badge municipal) | `src/components/Profile.test.tsx` | 1 ; 9 ; 12 |
| `Settings` (formulaire de préférences, `Switch`) | `src/components/Settings.test.tsx` | 11 — a révélé un défaut réel (§7 de `TESTS.md`) |
| `VoteDialog` (boîte de dialogue modale, branches pour/contre) | `src/components/VoteDialog.test.tsx` | 7 (Scripts) — focus/rôle de dialogue modale (Radix) |
| `MapView` (carte + liste, panneau de détail au clic) | `src/components/MapView.test.tsx` | 1 ; 9 ; 12 — `maplibre-gl` mocké (pas de rendu WebGL sous jsdom) |

Un test qui échoue explicitement si un contrôle *n'a pas* de label (`formControls.a11y.test.tsx`, « an Input with no associated Label is flagged ») sert de garde-fou : il vérifie que le harnais détecte bien une vraie violation, pas seulement qu'il ne trouve jamais rien. Cette hypothèse s'est confirmée en pratique : écrire les tests sur `PostDetail` et `Settings` a fait remonter deux vraies violations (barre de progression sans nom accessible, bouton icône-seule muet), corrigées dans le code — détail dans `TESTS.md` §7.

## 5. Ce qui n'est pas encore couvert

- **Contraste des couleurs** (thématique 3) : à vérifier manuellement dans un navigateur, cf. §3.
- **Ordre de tabulation réel et comportement lecteur d'écran** : nécessitent un test manuel, ne sont pas mesurables par `axe-core` sous jsdom.
- **Primitives `Dialog`/`Form` elles-mêmes** : couvertes indirectement à travers les écrans qui les utilisent (`VoteDialog`, `CreatePost`, `Settings`), pas de test isolé sur la primitive.

## 6. Lancer les vérifications

```bash
npm test        # exécute tous les tests, dont les tests d'accessibilité listés en §4
```

Les tests d'accessibilité ne sont pas isolés dans une commande séparée : ils font partie de la suite normale, au même titre que les tests fonctionnels, pour qu'une régression d'accessibilité fasse échouer la CI comme n'importe quel autre bug.
