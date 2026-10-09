# Accord de sous-traitance RGPD (art. 28) — brouillon

> Annexe 1 de l'offre commerciale. **À faire relire par un juriste ou un DPO avant tout envoi** : le choix du modèle (§1) conditionne tout le reste. Les champs `[À COMPLÉTER]` sont à renseigner.

## 1. Qualification des parties — à trancher

City Spot a deux types d'utilisateurs, et les rôles diffèrent :

| Traitement | Qui décide des finalités et moyens | Qualification |
|---|---|---|
| Comptes et contributions des **habitants** (inscription sur City Spot, signalements, votes, commentaires) | L'éditeur, selon les CGU de la plateforme | L'éditeur est **responsable de traitement** |
| Comptes des **agents** de la collectivité, notes privées, révocations, mails à la mairie | La collectivité, pour ses missions | La collectivité est **responsable de traitement**, l'éditeur est **sous-traitant** |
| Traitement des signalements reçus par la collectivité | La collectivité | La collectivité est responsable de traitement ; l'éditeur, destinataire puis sous-traitant |

Option à étudier avec le juriste : une **responsabilité conjointe** (art. 26) pour la partie « signalements des habitants » si la collectivité co-décide des finalités. Le texte ci-dessous suit le modèle **sous-traitance** pour la partie agents et notes privées.

## 2. Parties

**Responsable de traitement** : [À COMPLÉTER : collectivité, adresse, SIRET, représentant, délégué à la protection des données].
**Sous-traitant** : [À COMPLÉTER : éditeur, voir `src/constants/legal.ts`].

## 3. Objet, durée, nature

Le sous-traitant traite, pour le compte de la collectivité, les données nécessaires à la fourniture du service City Spot décrit dans l'offre commerciale. Durée : celle du contrat, plus la période de réversibilité.

- **Nature des opérations** : hébergement, stockage, consultation, transmission par mail, sauvegarde, suppression.
- **Finalités** : permettre aux agents de consulter, prioriser, commenter et révoquer des signalements ; informer les agents et les auteurs par mail.
- **Catégories de personnes** : agents de la collectivité ; habitants auteurs de signalements.
- **Types de données** : identité (nom), e-mail, ville, contenus des signalements (texte, adresse, coordonnées, photo), commentaires, votes, motifs de révocation, notes privées des agents, journaux techniques.
- **Données sensibles** : non attendues. Les utilisateurs ont pour consigne de ne pas publier de données de tiers ; un bouton « Signaler » permet de faire retirer un contenu.

## 4. Obligations du sous-traitant

1. **Instructions** : ne traiter les données que sur instruction documentée de la collectivité (le présent accord, l'offre, les demandes écrites) et l'informer si une instruction lui paraît contraire au RGPD.
2. **Confidentialité** : toute personne autorisée à traiter les données est tenue à la confidentialité.
3. **Sécurité** : mesures décrites dans l'annexe sécurité (contrôle d'accès par ligne, chiffrement en transit, supervision, sauvegardes).
4. **Sous-traitants ultérieurs** : autorisation générale de recourir à Supabase (Irlande), OVH (France), Resend et Sentry (États-Unis, clauses contractuelles types). Information de la collectivité [30] jours avant tout ajout ou remplacement ; droit d'opposition motivé.
5. **Droits des personnes** : assister la collectivité dans les demandes d'accès, rectification, effacement, limitation, portabilité et opposition ; transmettre dans les [5] jours toute demande reçue directement.
6. **Violation de données** : notifier la collectivité **sous 48 heures** après en avoir pris connaissance, avec les éléments utiles pour sa notification à la CNIL.
7. **Assistance** : aider la collectivité pour les analyses d'impact et consultations préalables si nécessaire.
8. **Sort des données** : à l'issue du contrat, restitution (export CSV, annexe sécurité §5) puis suppression des données dont la collectivité est responsable, sauf obligation légale de conservation. Les contenus publiés par les habitants sur la plateforme commune relèvent de l'éditeur (§1).
9. **Registre** : tenir le registre des catégories d'activités de traitement effectuées pour le compte de la collectivité.
10. **Audit** : mettre à disposition les informations nécessaires pour démontrer le respect de ces obligations et permettre des audits raisonnables (préavis de [30] jours, [1] par an, aux frais de la collectivité).

## 5. Transferts hors Union européenne

Resend et Sentry sont des sociétés américaines. Les transferts reposent sur les clauses contractuelles types de la Commission européenne **[À CONFIRMER : accord de traitement signé avec chaque prestataire, éventuelle certification au Data Privacy Framework]**. Les données de la base et des fichiers restent en Irlande.

## 6. Signatures

Pour la collectivité : ____________________  Pour l'éditeur : ____________________
