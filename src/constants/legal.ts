// Informations légales de l'éditeur, affichées dans les mentions légales, les
// CGU, la politique de confidentialité et la déclaration d'accessibilité.
//
// ⚠️ À REMPLIR À LA MAIN. Une valeur laissée vide s'affiche sur le site sous la
// forme « [À compléter : …] » (surlignée), pour qu'un oubli saute aux yeux.
// Rien d'autre à modifier dans les pages : tout passe par ce fichier.
export const LEGAL_INFO = {
  /** Raison sociale (ou nom commercial pour une entreprise individuelle). */
  companyName: '',
  /** Forme juridique : « SASU », « SAS », « Entreprise individuelle (micro-entrepreneur) »… */
  legalForm: '',
  /** Capital social, ex. « 1 000 € ». Laisser vide pour une entreprise individuelle (la ligne est alors masquée). */
  shareCapital: '',
  /** Numéro SIRET (14 chiffres). */
  siret: '',
  /** Ville du greffe, ex. « Lyon ». Laisser vide si l'entreprise n'est pas immatriculée au RCS (la ligne est alors masquée). */
  rcsCity: '',
  /** Numéro de TVA intracommunautaire. Laisser vide si non assujetti (la ligne est alors masquée). */
  vatNumber: '',
  /** Adresse postale du siège. */
  address: '',
  /** Téléphone (facultatif — la ligne est masquée si vide). */
  phone: '',
  /** Adresse e-mail de contact générale (aussi utilisée pour les demandes RGPD et le signalement de contenus illicites). */
  contactEmail: '',
  /** Directeur ou directrice de la publication (pour une entreprise individuelle : le nom de l'exploitant). */
  publicationDirector: '',
} as const;

/** Date de dernière mise à jour des textes juridiques (affichée en tête de chaque page). */
export const LEGAL_LAST_UPDATE = '9 octobre 2026';

/**
 * Version des CGU et de la politique de confidentialité acceptées à
 * l'inscription (enregistrée avec le compte, cf. authService.signUp). À
 * incrémenter à chaque modification substantielle des textes.
 */
export const TERMS_VERSION = '2026-10-09';
