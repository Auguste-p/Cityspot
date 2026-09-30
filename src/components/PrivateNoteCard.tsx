import { useEffect, useState } from 'react';
import { Lock } from 'lucide-react';
import { toast } from 'sonner';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { getPrivateNote, savePrivateNote } from '../services/issuesService';

const MAX_LENGTH = 2000;

export function PrivateNoteCard({ issueId, userId }: { issueId: string; userId: string }) {
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let isActive = true;
    getPrivateNote(issueId)
      .then((value) => { if (isActive) setNote(value); })
      .catch(() => { if (isActive) toast.error('Impossible de charger la note privée'); });
    return () => { isActive = false; };
  }, [issueId]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await savePrivateNote(issueId, userId, note);
      toast.success('Note enregistrée');
    } catch {
      toast.error("Impossible d'enregistrer la note");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="p-4 mb-6 bg-muted/30">
      <div className="flex items-start gap-3">
        <div className="p-2 bg-primary/10 rounded-lg">
          <Lock className="size-5 text-primary" />
        </div>
        <div className="flex-1 space-y-2">
          <Label htmlFor="private-note" className="text-sm text-muted-foreground">
            Note privée (visible uniquement par vous)
          </Label>
          <Textarea
            id="private-note"
            value={note}
            maxLength={MAX_LENGTH}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Ajouter une note interne sur ce signalement"
          />
          <Button size="sm" onClick={handleSave} disabled={saving}>
            Enregistrer
          </Button>
        </div>
      </div>
    </Card>
  );
}
