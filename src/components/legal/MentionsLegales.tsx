import { Link } from 'react-router';
import { ContactEmail, Info, LegalLayout } from './LegalLayout';
import { LEGAL_INFO } from '../../constants/legal';

export default function MentionsLegales() {
  return (
    <LegalLayout title="Mentions légales">
      <h2>1. Éditeur du site</h2>
      <p>
        Le site et l'application City Spot sont édités par <strong><Info field="companyName" label="raison sociale" /></strong>,{' '}
        <Info field="legalForm" label="forme juridique" />
        {LEGAL_INFO.shareCapital && <>, au capital de {LEGAL_INFO.shareCapital}</>}.
      </p>
      <ul>
        <li>SIRET : <Info field="siret" label="numéro SIRET" /></li>
        {LEGAL_INFO.rcsCity && <li>Immatriculation : RCS {LEGAL_INFO.rcsCity}</li>}
        {LEGAL_INFO.vatNumber && <li>TVA intracommunautaire : {LEGAL_INFO.vatNumber}</li>}
        <li>Siège : <Info field="address" label="adresse du siège" /></li>
        <li>E-mail : <ContactEmail /></li>
        {LEGAL_INFO.phone && <li>Téléphone : {LEGAL_INFO.phone}</li>}
      </ul>

      <h2>2. Directeur de la publication</h2>
      <p><Info field="publicationDirector" label="nom du directeur de la publication" /></p>

      <h2>3. Hébergement</h2>
      <ul>
        <li>
          <strong>Application web</strong> : OVH SAS, 2 rue Kellermann, 59100 Roubaix, France.
        </li>
        <li>
          <strong>Base de données, authentification et fichiers (photos, avatars)</strong> : Supabase Inc.,
          sur l'infrastructure d'Amazon Web Services, région Irlande (Union européenne).
        </li>
      </ul>

      <h2>4. Propriété intellectuelle</h2>
      <p>
        La marque City Spot, l'interface, les textes et le code de l'application sont la propriété de l'éditeur,
        sauf mention contraire. Toute reproduction ou réutilisation sans autorisation écrite est interdite.
      </p>
      <p>
        Les contenus publiés par les utilisateurs (signalements, photos, commentaires) restent leur propriété ;
        les droits concédés à l'éditeur sont décrits dans les <Link to="/cgu">conditions générales d'utilisation</Link>.
      </p>

      <h2>5. Crédits</h2>
      <ul>
        <li>Fonds de carte et recherche d'adresse : © contributeurs d'<a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>, données sous licence ODbL.</li>
        <li>Affichage cartographique : MapLibre GL JS (licence BSD).</li>
        <li>Composants d'interface : <a href="https://ui.shadcn.com/">shadcn/ui</a> et Radix UI (licence MIT) ; icônes Lucide (licence ISC).</li>
        <li>Certaines photographies proviennent d'<a href="https://unsplash.com/license">Unsplash</a> (licence Unsplash).</li>
      </ul>

      <h2>6. Données personnelles</h2>
      <p>
        Le traitement de vos données est décrit dans la <Link to="/confidentialite">politique de confidentialité</Link>.
        Pour exercer vos droits, écrivez à <ContactEmail />.
      </p>

      <h2>7. Signaler un contenu illicite</h2>
      <p>
        City Spot héberge des contenus publiés par ses utilisateurs. Un bouton « Signaler » est disponible sur chaque
        signalement et chaque commentaire. Vous pouvez aussi écrire à <ContactEmail /> en indiquant l'adresse
        de la page concernée, la description du contenu et les raisons pour lesquelles il est selon vous illicite. Le
        contenu manifestement illicite est retiré dans les meilleurs délais.
      </p>

      <h2>8. Accessibilité</h2>
      <p>
        L'état d'accessibilité du site est détaillé dans la <Link to="/accessibilite">déclaration d'accessibilité</Link>.
      </p>
    </LegalLayout>
  );
}
