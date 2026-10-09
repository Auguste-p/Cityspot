import { Link } from 'react-router';

const LINKS = [
  { to: '/mentions-legales', label: 'Mentions légales' },
  { to: '/cgu', label: 'CGU' },
  { to: '/confidentialite', label: 'Confidentialité' },
  { to: '/accessibilite', label: 'Accessibilité' },
] as const;

/** Liens vers les quatre pages légales — page de connexion, paramètres du profil et pied des pages légales. */
export function LegalLinks() {
  return (
    <nav aria-label="Informations légales" className="legal-links">
      {LINKS.map(({ to, label }) => (
        <Link key={to} to={to}>
          {label}
        </Link>
      ))}
    </nav>
  );
}
