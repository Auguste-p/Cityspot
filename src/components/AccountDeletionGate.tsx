import { useState } from 'react';
import { toast } from 'sonner';
import { restoreOwnAccount, signOut } from '../services/authService';
import { useUser } from '../context/UserContext';
import { Card } from './ui/card';
import { Button } from './ui/button';

const RETENTION_DAYS = 30;

function formatDate(date: Date): string {
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

export function AccountDeletionGate({ deletedAt }: { deletedAt: Date }) {
  const { refreshUser } = useUser();
  const [busy, setBusy] = useState(false);
  const purgeDate = new Date(deletedAt.getTime() + RETENTION_DAYS * 24 * 60 * 60 * 1000);

  const handleRestore = async () => {
    setBusy(true);
    try {
      await restoreOwnAccount();
      toast.success('Compte restauré.');
      await refreshUser();
    } catch (error) {
      console.error(error);
      toast.error('Impossible de restaurer le compte');
      setBusy(false);
    }
  };

  const handleDecline = async () => {
    setBusy(true);
    try {
      await signOut();
      await refreshUser();
    } catch (error) {
      console.error(error);
      toast.error('Impossible de se déconnecter');
      setBusy(false);
    }
  };

  return (
    <div className="h-screen flex items-center justify-center p-6">
      <Card className="p-8 text-center max-w-sm w-full space-y-4">
        <h2>Compte supprimé</h2>
        <p className="text-sm text-muted-foreground">
          Votre compte a été supprimé le {formatDate(deletedAt)}. Il sera
          définitivement effacé le {formatDate(purgeDate)}.
        </p>
        <div className="flex flex-col gap-2">
          <Button onClick={handleRestore} disabled={busy}>
            Restaurer mon compte
          </Button>
          <Button variant="ghost" onClick={handleDecline} disabled={busy}>
            Se déconnecter
          </Button>
        </div>
      </Card>
    </div>
  );
}
