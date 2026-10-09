# Offre commerciale City Spot — brouillon

> Modèle à adapter pour chaque collectivité. Les champs `[À COMPLÉTER]` sont à renseigner ; les prix sont des **propositions de départ** à confronter au marché (cf. §3). Ce modèle n'a pas été relu par un juriste : à faire valider avant le premier envoi, de même que l'accord de sous-traitance RGPD (art. 28) qui lui sera annexé.

## Notes internes (à retirer avant envoi)

À régler avant de signer le premier contrat :

- [ ] **Statut et SIRET** de l'éditeur, assurance RC professionnelle, attestations URSSAF et fiscale (pièces demandées par les collectivités).
- [ ] **Supabase en plan Pro** (sauvegardes quotidiennes, pas de mise en pause) — le plan gratuit ne permet pas de s'engager sur un SLA.
- [ ] **Fonds de carte et recherche d'adresse** : `tile.openstreetmap.org`, `photon.komoot.io` et `nominatim.openstreetmap.org` ne sont pas prévus pour un usage commercial à volume. Passer à un fournisseur payant ou à la Base Adresse Nationale.
- [ ] **Resend** : domaine d'expédition vérifié, sinon les mails ne partent pas aux agents.
- [ ] **Informations légales** renseignées dans `src/constants/legal.ts`.
- [x] ~~Rattachement à la commune par code INSEE~~ (fait, migration `20261010010000` : penser à renseigner `city_insee` du compte mairie de chaque nouvelle commune, cf. `MANUEL_MISE_A_JOUR.md` §6.1).
- [ ] Procédure de **sauvegarde / restauration** écrite et testée (annexe sécurité).

---

## 1. Parties

**Éditeur** : [À COMPLÉTER : raison sociale, forme juridique, SIRET, adresse, représentant]
**Collectivité** : [À COMPLÉTER : nom, adresse, SIRET, représentant, nombre d'habitants]

## 2. Objet

Mise à disposition, en mode SaaS, de l'application City Spot pour la commune de **[À COMPLÉTER]** : carte de signalements citoyens, vote et commentaires des habitants, tableau de bord et comptes « mairie » pour les agents, notifications par mail, révocation motivée de signalements.

## 3. Tarifs

| Population | Abonnement annuel HT |
|---|---|
| Moins de 2 000 habitants | 600 à 1 000 € |
| 2 000 à 10 000 habitants | 1 500 à 3 000 € |
| 10 000 à 50 000 habitants | 4 000 à 9 000 € |
| Plus de 50 000 habitants | Sur devis |

- **Tarif retenu pour la collectivité** : [À COMPLÉTER] € HT par an. TVA au taux en vigueur.
- **Frais de mise en service** (paramétrage, comptes agents, formation d'une heure) : [0 à 1 500] € HT, [offerts pour une collectivité pilote].
- **Pilote** : [3 à 6] mois à [gratuit / tarif symbolique], en échange du droit de citer la collectivité comme référence et d'un retour d'expérience.
- Le tarif couvre : hébergement, maintenance, mises à jour, supervision, sauvegardes, support, nombre illimité d'habitants et de [5] comptes « mairie » (comptes supplémentaires : [À COMPLÉTER]).

> Repères pour fixer le prix : 0,30 à 0,50 € par habitant et par an, dégressif. Coûts fixes de l'éditeur d'environ 1 200 €/an : il faut 3 à 5 clients pour couvrir l'infrastructure. Comparer avec les tarifs publics de solutions voisines (PanneauPocket, IntraMuros, outils de signalement) avant de figer.

## 4. Engagements de l'éditeur

- **Hébergement dans l'Union européenne** (base de données : Irlande ; application : France).
- **Disponibilité** : objectif de [99 %] par mois hors maintenance annoncée, supervision continue avec alertes. *[À ne chiffrer en engagement qu'une fois les sauvegardes et la restauration testées.]*
- **Support** : par e-mail, jours ouvrés, réponse sous [2] jours ouvrés ; incident bloquant pris en compte sous [4] heures ouvrées.
- **Évolutions** : mises à jour correctives et évolutives incluses ; préavis de [15] jours pour une modification pouvant affecter l'usage.
- **Sécurité** : contrôle d'accès par ligne de données, mots de passe hachés, journalisation des accès refusés, tests automatisés exécutés à chaque modification. Documentation de sécurité (OWASP) et d'accessibilité (RGAA) fournie sur demande.

## 5. Données personnelles

- Les habitants s'inscrivent sur City Spot ; l'éditeur est responsable du traitement de leurs comptes. La collectivité traite, pour ses missions, les signalements de sa commune.
- Les rôles respectifs sont précisés dans l'**accord de sous-traitance / de responsabilité** annexé (art. 26 ou 28 du RGPD selon l'analyse retenue) : [À COMPLÉTER après avis juridique].
- Sous-traitants ultérieurs : Supabase (Irlande), OVH (France), Resend, Sentry (États-Unis, clauses contractuelles types). Liste tenue à jour dans la politique de confidentialité.
- **Réversibilité** : à la fin du contrat, export des signalements de la commune (format CSV / JSON) sous [30] jours, puis suppression des données de la collectivité sous [90] jours.

## 6. Durée, paiement, résiliation

- **Durée** : [12] mois à compter de la mise en service, reconduction tacite annuelle, résiliation par lettre ou mail avec préavis de [2] mois avant l'échéance.
- **Facturation** : annuelle, à l'avance, via **Chorus Pro** ; paiement à 30 jours (délai global de paiement des collectivités).
- **Révision de prix** : [indexation annuelle sur l'indice Syntec / plafonnée à 3 %].
- **Résiliation pour manquement** : après mise en demeure restée sans effet pendant 30 jours.

## 7. Responsabilité

La responsabilité de l'éditeur est limitée aux dommages directs et plafonnée au montant payé au cours des 12 derniers mois. City Spot n'est pas un service d'urgence ; l'éditeur n'est pas responsable de l'action ou de l'inaction de la collectivité sur un signalement. Les contenus des habitants sont soumis aux CGU et à la modération décrite dans celles-ci.

## 8. Droit applicable

Droit français. Tribunal administratif ou judiciaire compétent selon la nature du litige. [À valider par un juriste.]

## 9. Pièces annexes

1. Accord de sous-traitance RGPD (à rédiger)
2. Politique de confidentialité et CGU des habitants (https://projet-cityspot.fr/confidentialite, /cgu)
3. Déclaration d'accessibilité (/accessibilite)
4. Annexe sécurité (tirée de `docs/SECURITE.md`) et plan de sauvegarde / restauration
5. Pièces administratives : Kbis ou SIRET, attestation d'assurance RC professionnelle, attestations URSSAF et fiscale, RIB

**Fait à [À COMPLÉTER], le [À COMPLÉTER], en deux exemplaires.**

Pour l'éditeur : ____________________  Pour la collectivité : ____________________
