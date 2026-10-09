import { Link } from 'react-router';
import { ContactEmail, Info, LegalLayout } from './LegalLayout';

export default function Confidentialite() {
  return (
    <LegalLayout title="Politique de confidentialité">
      <h2>1. Qui est responsable de vos données ?</h2>
      <p>
        Le responsable du traitement est <strong><Info field="companyName" label="raison sociale" /></strong>, <Info field="address" label="adresse du siège" />{' '}
        (voir les <Link to="/mentions-legales">mentions légales</Link>). Contact pour toute question ou demande : <ContactEmail />.
      </p>
      <p>
        Les collectivités qui utilisent la vue « mairie » traitent, pour leurs propres missions, les signalements qui les concernent,
        sous leur responsabilité.
      </p>

      <h2>2. Données collectées</h2>
      <table>
        <thead>
          <tr>
            <th scope="col">Catégorie</th>
            <th scope="col">Données</th>
            <th scope="col">Origine</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Compte</td>
            <td>Adresse e-mail, mot de passe (conservé sous forme hachée), nom, ville (et coordonnées de son centre), date et version des CGU acceptées</td>
            <td>Vous, à l'inscription</td>
          </tr>
          <tr>
            <td>Profil (facultatif)</td>
            <td>Téléphone, adresse, photo de profil, préférences (notifications par e-mail, visibilité du profil)</td>
            <td>Vous, dans les Paramètres</td>
          </tr>
          <tr>
            <td>Contributions</td>
            <td>Signalements (titre, description, adresse et coordonnées, photo, catégories, tâches, matériel), commentaires, votes, notes privées des comptes mairie</td>
            <td>Vous</td>
          </tr>
          <tr>
            <td>Tiers</td>
            <td>Adresse e-mail du propriétaire d'un lieu privé, si vous la renseignez dans un signalement ; seuls l'auteur du signalement et la mairie de la commune concernée peuvent la lire</td>
            <td>L'auteur du signalement</td>
          </tr>
          <tr>
            <td>Signalements de contenus</td>
            <td>Motif, précisions éventuelles, identifiant du compte qui signale</td>
            <td>Vous, via le bouton « Signaler »</td>
          </tr>
          <tr>
            <td>Données techniques</td>
            <td>Adresse IP, type de navigateur, pages consultées (journaux des serveurs, mesure d'audience, rapports d'erreurs)</td>
            <td>Votre navigateur</td>
          </tr>
        </tbody>
      </table>
      <p>
        La position de votre appareil n'est jamais demandée : le bouton « Recentrer » de la carte utilise la ville de votre profil.
      </p>

      <h2>3. Pourquoi et sur quelle base légale ?</h2>
      <table>
        <thead>
          <tr>
            <th scope="col">Finalité</th>
            <th scope="col">Base légale</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Créer et gérer votre compte, publier et afficher vos signalements, commentaires et votes</td>
            <td>Exécution du contrat (CGU)</td>
          </tr>
          <tr>
            <td>Prévenir la mairie de la commune concernée, informer l'auteur d'une révocation, vous envoyer les notifications que vous avez activées</td>
            <td>Exécution du contrat ; intérêt légitime (informer les parties du traitement d'un signalement)</td>
          </tr>
          <tr>
            <td>Modérer les contenus, traiter les signalements de contenus, sécuriser le service et lutter contre les abus</td>
            <td>Intérêt légitime ; obligation légale (LCEN)</td>
          </tr>
          <tr>
            <td>Mesurer l'audience du site de façon anonyme, détecter et corriger les erreurs</td>
            <td>Intérêt légitime</td>
          </tr>
        </tbody>
      </table>

      <h2>4. Qui voit vos données ?</h2>
      <ul>
        <li><strong>Les autres utilisateurs connectés</strong> voient vos signalements et vos commentaires (avec votre nom), ainsi que vos photos. Votre profil public (nom, photo, ville) n'est visible que si vous activez « Visibilité du profil » dans les Paramètres.</li>
        <li><strong>La mairie de la commune</strong> du signalement voit les signalements de sa commune, et reçoit un e-mail pour certaines catégories (voirie, éclairage, sécurité, mobilier urbain). Elle ne voit ni votre e-mail de connexion, ni votre téléphone, ni votre adresse ; elle voit en revanche l'adresse e-mail du propriétaire d'un lieu privé si l'auteur d'un signalement l'a renseignée, et des statistiques anonymes sur sa commune (nombre d'inscrits, de signalements, de votes et de commentaires, délais de résolution), qui ne permettent d'identifier personne. Une mairie est rattachée à une commune par son code INSEE.</li>
        <li><strong>L'éditeur</strong> y accède pour exploiter, sécuriser et modérer le service.</li>
        <li><strong>Nos prestataires</strong> (ci-dessous), qui n'agissent que sur nos instructions.</li>
      </ul>
      <p>Vos données ne sont ni vendues, ni utilisées à des fins publicitaires.</p>

      <h2>5. Prestataires et transferts hors Union européenne</h2>
      <table>
        <thead>
          <tr>
            <th scope="col">Prestataire</th>
            <th scope="col">Rôle</th>
            <th scope="col">Localisation</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Supabase Inc.</td>
            <td>Base de données, authentification, stockage des photos</td>
            <td>Irlande (AWS) ; société américaine, transfert encadré par des clauses contractuelles types</td>
          </tr>
          <tr>
            <td>OVH SAS</td>
            <td>Hébergement de l'application, mesure d'audience (Matomo auto-hébergé) et supervision</td>
            <td>France</td>
          </tr>
          <tr>
            <td>Resend, Inc.</td>
            <td>Envoi des e-mails (confirmation, notifications)</td>
            <td>États-Unis ; clauses contractuelles types</td>
          </tr>
          <tr>
            <td>Functional Software, Inc. (Sentry)</td>
            <td>Suivi des erreurs de l'application (adresse IP, navigateur, page concernée)</td>
            <td>États-Unis ; clauses contractuelles types</td>
          </tr>
          <tr>
            <td>Etalab / DINUM (API Géo, geo.api.gouv.fr)</td>
            <td>Recherche de commune et code INSEE : reçoit votre adresse IP, le nom de commune saisi ou les coordonnées du lieu d'un signalement</td>
            <td>France</td>
          </tr>
          <tr>
            <td>OpenStreetMap Foundation, Komoot GmbH</td>
            <td>Fonds de carte et recherche d'adresse : reçoivent votre adresse IP et le texte recherché</td>
            <td>Royaume-Uni, Allemagne</td>
          </tr>
        </tbody>
      </table>

      <h2>6. Combien de temps ?</h2>
      <ul>
        <li><strong>Compte actif</strong> : pendant toute la durée du compte.</li>
        <li><strong>Suppression du compte</strong> : votre compte est désactivé immédiatement et reste récupérable 30 jours (reconnectez-vous pour annuler). Passé ce délai, votre nom, téléphone, adresse, ville et photo de profil sont définitivement effacés. Vos signalements, commentaires et votes sont conservés pour l'intérêt des collectivités, sans votre nom (« Utilisateur supprimé »).</li>
        <li><strong>Adresse e-mail de connexion</strong> : elle reste dans le système d'authentification après la purge ; pour l'effacer aussi, écrivez à <ContactEmail />.</li>
        <li><strong>Signalements de contenus</strong> : le temps de leur traitement, puis au plus 12 mois.</li>
        <li><strong>Journaux techniques</strong> : au plus 12 mois (la loi impose aux hébergeurs de conserver un an les données permettant d'identifier l'auteur d'un contenu).</li>
        <li><strong>Mesure d'audience</strong> : données anonymisées, 13 mois au plus.</li>
      </ul>

      <h2>7. Vos droits</h2>
      <p>
        Vous pouvez à tout moment demander l'accès à vos données, leur rectification, leur effacement, leur limitation, leur portabilité,
        ou vous opposer à certains traitements, et donner des directives sur le sort de vos données après votre décès. Une partie de ces
        actions est possible directement dans les <strong>Paramètres</strong> (modification du profil, visibilité, notifications,
        suppression du compte). Pour le reste, écrivez à <ContactEmail /> ; nous répondons sous un mois.
      </p>
      <p>
        Si vous estimez que vos droits ne sont pas respectés, vous pouvez introduire une réclamation auprès de la CNIL
        (<a href="https://www.cnil.fr/fr/plaintes">cnil.fr/plaintes</a>, 3 place de Fontenoy, TSA 80715, 75334 Paris Cedex 07).
      </p>

      <h2>8. Cookies et traceurs</h2>
      <ul>
        <li><strong>Session de connexion</strong> : l'application conserve votre session dans le stockage local de votre navigateur. Strictement nécessaire au service, elle ne requiert pas de consentement.</li>
        <li><strong>Mesure d'audience</strong> : Matomo, hébergé par nos soins, configuré sans cookie, avec adresse IP anonymisée et sans croisement avec d'autres sites. Il est exempté de consentement.</li>
        <li><strong>Aucun traceur publicitaire</strong> n'est utilisé.</li>
      </ul>

      <h2>9. Sécurité</h2>
      <p>
        Les échanges sont chiffrés (HTTPS), les mots de passe sont hachés, et l'accès aux données est limité en base par des règles
        de sécurité au niveau de chaque ligne : un utilisateur ne peut modifier que ses propres contenus. Le service surveille
        les accès refusés et les erreurs. Aucune mesure ne garantit un risque nul ; en cas de violation de données susceptible
        d'engendrer un risque pour vous, nous vous en informons ainsi que la CNIL, conformément à la loi.
      </p>

      <h2>10. Mineurs</h2>
      <p>
        Le service est réservé aux personnes de 15 ans et plus. En dessous, l'accord d'un titulaire de l'autorité parentale est requis.
      </p>

      <h2>11. Évolutions</h2>
      <p>Cette politique peut évoluer ; la date de mise à jour figure en haut de la page.</p>
    </LegalLayout>
  );
}
