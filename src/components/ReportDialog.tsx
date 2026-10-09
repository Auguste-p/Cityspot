import { useState } from 'react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Label } from './ui/label';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Button } from './ui/button';
import { reportContent, type ReportReason } from '../services/issuesService';

const REASONS: { value: ReportReason; label: string }[] = [
  { value: 'illegal', label: 'Contenu illicite' },
  { value: 'harassment', label: 'Injure, harcèlement ou haine' },
  { value: 'privacy', label: 'Atteinte à la vie privée (visage, plaque, coordonnées)' },
  { value: 'spam', label: 'Spam ou publicité' },
  { value: 'other', label: 'Autre' },
];

interface ReportDialogProps {
  open: boolean;
  onClose: () => void;
  userId: string;
  issueId: string;
  /** Absent : on signale le signalement lui-même. */
  commentId?: string;
}

export function ReportDialog({ open, onClose, userId, issueId, commentId }: ReportDialogProps) {
  const [reason, setReason] = useState<ReportReason | ''>('');
  const [details, setDetails] = useState('');
  const [sending, setSending] = useState(false);

  const target = commentId ? 'ce commentaire' : 'ce signalement';

  const handleSubmit = async () => {
    if (!reason) return;
    setSending(true);
    try {
      const result = await reportContent({ userId, issueId, commentId, reason, details });
      toast.success(
        result === 'duplicate' ? 'Vous avez déjà signalé ce contenu.' : 'Merci, votre signalement a été transmis.',
      );
      setReason('');
      setDetails('');
      onClose();
    } catch {
      toast.error("Impossible d'envoyer le signalement. Réessayez plus tard.");
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Signaler {target}</DialogTitle>
          <DialogDescription>
            Il sera examiné par l'éditeur du site. Votre identité n'est pas communiquée à l'auteur du contenu.
          </DialogDescription>
        </DialogHeader>

        <RadioGroup
          value={reason}
          onValueChange={(value) => setReason(value as ReportReason)}
          aria-label="Motif du signalement"
          aria-required="true"
        >
          {REASONS.map(({ value, label }) => (
            <div key={value} className="flex items-center gap-2">
              <RadioGroupItem value={value} id={`report-reason-${value}`} />
              <Label htmlFor={`report-reason-${value}`}>{label}</Label>
            </div>
          ))}
        </RadioGroup>

        <Label htmlFor="report-details" className="text-sm">
          Précisions (facultatif)
        </Label>
        <textarea
          id="report-details"
          value={details}
          maxLength={500}
          onChange={(e) => setDetails(e.target.value)}
          className="w-full p-3 bg-input-background rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-ring resize-none"
          rows={3}
        />

        <Button onClick={handleSubmit} disabled={sending || !reason}>
          {sending ? 'Envoi...' : 'Envoyer le signalement'}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
