import { Link } from 'react-router';
import { ContactEmail, Info, LegalLayout } from './LegalLayout';
import { LEGAL_LAST_UPDATE } from '../../constants/legal';

export default function Accessibilite() {
  return (
    <LegalLayout title="Déclaration d'accessibilité">
      <p>
        <Info field="companyName" label="raison sociale" /> s'engage à rendre City Spot accessible, conformément à l'article 47 de la
        loi n° 2005-102 du 11 février 2005. Cette déclaration s'applique à l'application web City Spot, accessible depuis le
        navigateur, sur ordinateur comme sur mobile.
      </p>

      <h2>1. État de conformité</h2>
      <p>
        City Spot est <strong>en cours de mise en conformité</strong> avec le Référentiel général d'amélioration de l'accessibilité
        (RGAA) version 4.1. Un audit de conformité complet par un tiers n'a pas encore été réalisé : <strong>aucun taux de
        conformité n'est donc déclaré</strong>. Cette déclaration sera mise à jour à l'issue de cet audit.
      </p>

      <h2>2. Ce qui a été vérifié</h2>
      <ul>
        <li>Des contrôles automatisés (outil axe-core, règles WCAG 2.1 niveaux A et AA) sont exécutés sur tous les écrans de l'application à chaque modification du code. Aucune violation détectée par ces contrôles à la date de cette déclaration.</li>
        <li>Champs de formulaire associés à des libellés, champs obligatoires signalés, boutons-icônes nommés, structure de titres, messages d'état annoncés par les lecteurs d'écran, boîtes de dialogue gérées par la bibliothèque Radix UI.</li>
      </ul>

      <h2>3. Contenus non accessibles ou non vérifiés</h2>
      <ul>
        <li><strong>Contrastes de couleurs</strong> : non mesurés dans un navigateur réel ; certains textes peuvent être insuffisamment contrastés.</li>
        <li><strong>Navigation au clavier et lecteurs d'écran</strong> : l'ordre de tabulation et la restitution par lecteur d'écran n'ont pas été testés manuellement.</li>
        <li><strong>Carte interactive</strong> : son utilisation au clavier et au lecteur d'écran n'a pas été évaluée. La liste des signalements et les pages de détail donnent accès aux mêmes informations sans passer par la carte.</li>
        <li><strong>Photos des signalements</strong> : elles sont fournies par les utilisateurs et n'ont pas toujours d'alternative textuelle équivalente ; la description du signalement en tient lieu.</li>
      </ul>

      <h2>4. Établissement de cette déclaration</h2>
      <ul>
        <li>Déclaration établie le {LEGAL_LAST_UPDATE}.</li>
        <li>Technologies utilisées : HTML, CSS, JavaScript (React).</li>
        <li>Outils d'évaluation : axe-core (intégré aux tests automatisés).</li>
        <li>Pages vérifiées : connexion et inscription, carte, création et modification d'un signalement, détail d'un signalement, profil et profil public, paramètres, tableau de bord de la mairie, pages légales.</li>
      </ul>

      <h2>5. Retour d'information et contact</h2>
      <p>
        Si vous n'arrivez pas à accéder à un contenu ou à un service, ou si vous souhaitez en obtenir une version accessible, écrivez à{' '}
        <ContactEmail />. Nous nous engageons à répondre sous 15 jours.
      </p>

      <h2>6. Voies de recours</h2>
      <p>
        Si vous constatez un défaut d'accessibilité vous empêchant d'accéder à un contenu ou une fonctionnalité du site, que vous nous
        l'avez signalé et que vous n'avez pas obtenu de réponse satisfaisante, vous pouvez écrire au Défenseur des droits :
      </p>
      <ul>
        <li><a href="https://formulaire.defenseurdesdroits.fr/">Formulaire de contact en ligne</a></li>
        <li>Défenseur des droits, Libre réponse 71120, 75342 Paris CEDEX 07</li>
        <li>Téléphone : 09 69 39 00 00</li>
      </ul>
      <p>
        Voir aussi les <Link to="/mentions-legales">mentions légales</Link>.
      </p>
    </LegalLayout>
  );
}
