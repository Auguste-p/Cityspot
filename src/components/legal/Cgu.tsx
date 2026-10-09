import { Link } from 'react-router';
import { ContactEmail, Info, LegalLayout } from './LegalLayout';

export default function Cgu() {
  return (
    <LegalLayout title="Conditions générales d'utilisation">
      <h2>1. Objet</h2>
      <p>
        Les présentes conditions encadrent l'utilisation de City Spot, un service en ligne édité par{' '}
        <Info field="companyName" label="raison sociale" /> (« l'éditeur », voir les <Link to="/mentions-legales">mentions légales</Link>)
        qui permet aux habitants de signaler des dégradations de l'espace public, de voter pour prioriser les
        signalements et de suivre leur traitement par les collectivités.
      </p>

      <h2>2. Acceptation</h2>
      <p>
        La création d'un compte suppose d'avoir lu et accepté ces conditions ainsi que la{' '}
        <Link to="/confidentialite">politique de confidentialité</Link> (case à cocher à l'inscription). La date et la version
        acceptées sont enregistrées avec votre compte. L'utilisation du service vaut acceptation de la version en vigueur.
      </p>

      <h2>3. Le service</h2>
      <ul>
        <li>Créer un signalement : titre, description, adresse, photo, catégories, tâches et matériel nécessaires.</li>
        <li>Voter pour ou contre un signalement et le commenter. Un signalement passe « en cours » lorsque l'écart entre les votes pour et contre atteint le seuil affiché dans l'application.</li>
        <li>Suivre l'avancement des signalements sur la carte et depuis son profil.</li>
        <li>Pour les agents des collectivités : un tableau de bord réservé aux comptes « mairie », permettant de piloter les signalements de leur commune.</li>
      </ul>

      <h2>4. Un service indépendant, pas un service d'urgence</h2>
      <p>
        City Spot est un outil indépendant : il n'est pas, sauf mention expresse, un service officiel d'une collectivité, et
        l'envoi d'un signalement ne crée aucune obligation d'intervention de la part de la collectivité ni de l'éditeur.
        Le statut d'un signalement (« en vote », « en cours », « terminé ») est indicatif.
      </p>
      <p>
        <strong>City Spot ne doit jamais être utilisé en cas de danger immédiat</strong> (blessure, incendie, risque
        d'effondrement, câble au sol…). Appelez alors les secours : 112 (urgences), 15 (SAMU), 17 (police), 18 (pompiers).
      </p>

      <h2>5. Compte</h2>
      <ul>
        <li>Le service est réservé aux personnes âgées d'au moins 15 ans.</li>
        <li>Les informations fournies à l'inscription doivent être exactes. Un compte est personnel ; vous êtes responsable de la confidentialité de votre mot de passe.</li>
        <li>Les comptes « mairie » sont attribués par l'éditeur à des agents habilités d'une collectivité, après vérification. Ils ne doivent être utilisés que pour les missions de cette collectivité.</li>
        <li>Vous pouvez supprimer votre compte à tout moment depuis les Paramètres (voir la <Link to="/confidentialite">politique de confidentialité</Link> pour ses effets).</li>
      </ul>

      <h2>6. Règles de contribution</h2>
      <p>Vous vous engagez à publier des contenus exacts, de bonne foi et en rapport avec l'espace public. Sont interdits :</p>
      <ul>
        <li>les contenus illicites, injurieux, diffamatoires, discriminatoires, haineux ou incitant à la violence ;</li>
        <li>les contenus portant atteinte à la vie privée : visages identifiables, plaques d'immatriculation, noms, coordonnées de tiers (floutez-les ou cadrez autrement) ;</li>
        <li>les faux signalements, les signalements abusifs ou répétés, la publicité et le démarchage ;</li>
        <li>l'usurpation d'identité, y compris celle d'un agent ou d'une collectivité ;</li>
        <li>toute tentative de contourner la sécurité du service, de perturber son fonctionnement ou d'extraire massivement ses données.</li>
      </ul>
      <p>
        Pour un signalement sur une propriété privée, indiquez-le dans le formulaire. Si vous n'en êtes pas propriétaire,
        l'adresse e-mail du propriétaire ne doit être renseignée que si vous la connaissez légitimement.
      </p>

      <h2>7. Vos contenus</h2>
      <p>
        Vous restez titulaire des droits sur vos signalements, photos et commentaires. Vous concédez à l'éditeur une
        licence non exclusive, gratuite et mondiale, pour la durée du service, afin de les héberger, de les afficher aux autres
        utilisateurs, de les transmettre aux collectivités concernées et d'en produire des statistiques non nominatives. Vous garantissez avoir les droits
        nécessaires sur ce que vous publiez.
      </p>
      <p>
        Les contenus publiés sont visibles des autres utilisateurs connectés ; les photos sont servies à une adresse web
        publique. Ne publiez rien que vous ne souhaitez pas rendre visible.
      </p>

      <h2>8. Modération, signalement de contenus et révocation</h2>
      <ul>
        <li>Un bouton « Signaler » est disponible sur chaque signalement et chaque commentaire. Les signalements de contenus sont examinés par l'éditeur.</li>
        <li>L'éditeur peut retirer tout contenu contraire à ces conditions ou manifestement illicite, et suspendre ou supprimer un compte en cas de manquement.</li>
        <li>La mairie d'une commune peut « révoquer » un signalement situé sur son territoire (par exemple s'il est hors sujet, déjà traité ou inexact) en indiquant un motif. Le signalement est alors retiré de la carte et des listes ; seuls son auteur et la mairie peuvent encore l'ouvrir, avec le motif. L'auteur en est informé par e-mail.</li>
      </ul>
      <p>
        Pour notifier un contenu illicite : <ContactEmail />, en indiquant la page concernée, la description du contenu et le motif.
      </p>

      <h2>9. Responsabilité</h2>
      <p>
        L'éditeur agit en qualité d'hébergeur des contenus publiés par les utilisateurs : il n'en est pas l'auteur et n'est responsable
        que s'il ne les retire pas promptement après en avoir eu connaissance de manière effective. Chaque utilisateur est responsable de
        ce qu'il publie.
      </p>
      <p>
        Le service est fourni « en l'état », sans garantie de disponibilité continue ni d'absence d'erreur. L'éditeur n'est pas
        responsable des décisions, retards ou absences de réaction des collectivités, ni des dommages indirects. Rien dans ces
        conditions n'exclut la responsabilité de l'éditeur en cas de faute lourde ou dolosive, ni les droits que la loi reconnaît
        aux consommateurs.
      </p>

      <h2>10. Données personnelles</h2>
      <p>
        L'éditeur traite vos données conformément à la <Link to="/confidentialite">politique de confidentialité</Link>. Pour toute
        demande : <ContactEmail />.
      </p>

      <h2>11. Collectivités</h2>
      <p>
        L'utilisation de City Spot par une collectivité (comptes « mairie », vue municipale, notifications) fait l'objet d'un contrat
        distinct, qui prévaut sur les présentes conditions pour ce qui la concerne.
      </p>

      <h2>12. Propriété intellectuelle</h2>
      <p>
        Le service, sa marque, son interface et son code sont protégés. Aucun droit n'est cédé sur ces éléments, hormis le droit
        personnel et non transférable d'utiliser le service conformément à ces conditions. Les données cartographiques sont
        © contributeurs d'OpenStreetMap (licence ODbL).
      </p>

      <h2>13. Modification des conditions</h2>
      <p>
        Ces conditions peuvent évoluer. La date de mise à jour figure en haut de la page. En cas de modification substantielle, les
        utilisateurs en sont informés dans l'application ou par e-mail ; poursuivre l'utilisation du service après cette
        information vaut acceptation.
      </p>

      <h2>14. Droit applicable et litiges</h2>
      <p>
        Ces conditions sont soumises au droit français. En cas de litige, une solution amiable est recherchée avant toute action
        en justice. À défaut, les tribunaux compétents sont ceux déterminés par les règles de droit commun ; un consommateur conserve le
        droit de saisir le tribunal de son domicile.
      </p>
    </LegalLayout>
  );
}
