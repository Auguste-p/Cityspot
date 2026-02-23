import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Label } from './ui/label';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { ThumbsUp, ThumbsDown, Target } from 'lucide-react';

interface VoteDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onVote: (type: 'positive' | 'negative', commitment: 'simple' | 'engage' | 'lead') => void;
  postTitle: string;
  currentVotes: { positive: number; negative: number };
}

export function VoteDialog({ isOpen, onClose, onVote, postTitle, currentVotes }: VoteDialogProps) {
  const [voteType, setVoteType] = useState<'positive' | 'negative'>('positive');
  const [commitment, setCommitment] = useState<'simple' | 'engage' | 'lead'>('simple');

  const handleSubmit = () => {
    onVote(voteType, commitment);
    onClose();
  };

  const voteDifference = currentVotes.positive - currentVotes.negative;
  const voteGoal = 10;
  const progress = Math.min((voteDifference / voteGoal) * 100, 100);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Voter pour le projet</DialogTitle>
          <DialogDescription>{postTitle}</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Vote Progress */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Objectif: +10 votes</span>
              <span className="font-medium">{voteDifference} / {voteGoal}</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <ThumbsUp className="size-3" />
                <span>{currentVotes.positive} positifs</span>
              </div>
              <div className="flex items-center gap-1">
                <ThumbsDown className="size-3" />
                <span>{currentVotes.negative} négatifs</span>
              </div>
            </div>
          </div>

          {/* Vote Type */}
          <div className="space-y-3">
            <Label>Votre vote</Label>
            <RadioGroup value={voteType} onValueChange={(value: 'positive' | 'negative') => setVoteType(value)}>
              <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-accent/50 transition-colors cursor-pointer">
                <RadioGroupItem value="positive" id="vote-positive" />
                <Label htmlFor="vote-positive" className="cursor-pointer flex items-center gap-2 flex-1">
                  <ThumbsUp className="size-4 text-green-600" />
                  <div>
                    <div>Pour ce projet</div>
                    <div className="text-xs text-muted-foreground">Je soutiens cette initiative</div>
                  </div>
                </Label>
              </div>
              <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-accent/50 transition-colors cursor-pointer">
                <RadioGroupItem value="negative" id="vote-negative" />
                <Label htmlFor="vote-negative" className="cursor-pointer flex items-center gap-2 flex-1">
                  <ThumbsDown className="size-4 text-red-600" />
                  <div>
                    <div>Contre ce projet</div>
                    <div className="text-xs text-muted-foreground">Je ne soutiens pas cette initiative</div>
                  </div>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Commitment Level */}
          {voteType === 'positive' && (
            <div className="space-y-3">
              <Label>Niveau d'engagement</Label>
              <RadioGroup value={commitment} onValueChange={(value: 'simple' | 'engage' | 'lead') => setCommitment(value)}>
                <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-accent/50 transition-colors cursor-pointer">
                  <RadioGroupItem value="simple" id="commit-simple" />
                  <Label htmlFor="commit-simple" className="cursor-pointer flex-1">
                    <div>Proposition simple</div>
                    <div className="text-xs text-muted-foreground">Je vote pour mais ne participe pas</div>
                  </Label>
                </div>
                <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-accent/50 transition-colors cursor-pointer">
                  <RadioGroupItem value="engage" id="commit-engage" />
                  <Label htmlFor="commit-engage" className="cursor-pointer flex-1">
                    <div>S'engager</div>
                    <div className="text-xs text-muted-foreground">Je veux participer activement</div>
                  </Label>
                </div>
                <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-accent/50 transition-colors cursor-pointer">
                  <RadioGroupItem value="lead" id="commit-lead" />
                  <Label htmlFor="commit-lead" className="cursor-pointer flex-1">
                    <div className="flex items-center gap-2">
                      <span>Prendre le lead</span>
                      <Target className="size-4 text-primary" />
                    </div>
                    <div className="text-xs text-muted-foreground">Je veux coordonner le projet</div>
                  </Label>
                </div>
              </RadioGroup>
            </div>
          )}
        </div>

        <DialogFooter>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-muted text-muted-foreground rounded-lg hover:bg-muted/80 transition-colors"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            Valider mon vote
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
