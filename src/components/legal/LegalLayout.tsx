import type { ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { ArrowLeft } from 'lucide-react';
import { Button } from '../ui/button';
import { LegalLinks } from './LegalLinks';
import { LEGAL_INFO, LEGAL_LAST_UPDATE } from '../../constants/legal';

type LegalField = keyof typeof LEGAL_INFO;

/** Valeur renseignée dans `constants/legal.ts`, ou emplacement surligné si elle est vide. */
export function Info({ field, label }: { field: LegalField; label: string }) {
  const value = LEGAL_INFO[field];
  if (value) return <>{value}</>;
  return <mark className="legal-todo">[À compléter : {label}]</mark>;
}

/** E-mail de contact cliquable (ou emplacement surligné s'il n'est pas renseigné). */
export function ContactEmail() {
  const email = LEGAL_INFO.contactEmail;
  if (!email) return <Info field="contactEmail" label="e-mail de contact" />;
  return <a href={`mailto:${email}`}>{email}</a>;
}

export function LegalLayout({ title, children }: { title: string; children: ReactNode }) {
  const navigate = useNavigate();

  // Ouvert dans un nouvel onglet, il n'y a pas d'historique vers lequel revenir.
  const goBack = () => (window.history.length > 1 ? navigate(-1) : navigate('/'));

  return (
    <div className="min-h-screen bg-background">
      <div className="legal-page">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={goBack}
          className="flex items-center gap-2 text-muted-foreground"
        >
          <ArrowLeft className="size-5" aria-hidden="true" />
          <span>Retour</span>
        </Button>
        <main>
          <h1>{title}</h1>
          <p className="legal-meta">Dernière mise à jour : {LEGAL_LAST_UPDATE}</p>
          {children}
        </main>
        <footer>
          <LegalLinks />
        </footer>
      </div>
    </div>
  );
}
