import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import {
  MapPin,
  Calendar,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Edit,
  Trash2,
  MessageSquare,
  Share2,
  Package,
  Home,
  ThumbsUp,
  ThumbsDown,
  Mail,
  Info,
  Building2,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { VoteDialog } from './VoteDialog';
import { MUNICIPAL_GRADIENT_CLASS, VOTE_GOAL, VOTE_GOAL_LABEL, getActualStatus, getStatusConfig } from '../lib/postStatus';
import { useComments, useIssue, useVotes } from '../hooks/useIssues';
import { useUser } from '../context/UserContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { deleteIssue } from '../services/issuesService';

function getVoterIdentity(isMe: boolean, userName?: string) {
  return {
    label: isMe ? (userName ?? 'Moi') : 'Citoyen',
    avatar: isMe ? (userName?.[0]?.toUpperCase() ?? 'M') : 'C',
  };
}

export function PostDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useUser();
  const { issue: post, loading, error } = useIssue(id);
  const { comments, loading: commentsLoading, error: commentsError, addComment } = useComments(id);
  const { votes, loading: votesLoading, addVote } = useVotes(id);
  const [tasks, setTasks] = useState(post?.tasks || []);
  const [voteDialogOpen, setVoteDialogOpen] = useState(false);
  const [votersDialogOpen, setVotersDialogOpen] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const positiveVotes = votes.filter((v) => v.yes).length;
  const negativeVotes = votes.filter((v) => !v.yes).length;
  const hasVoted = !votesLoading && votes.some((v) => v.id_user === user?.id);

  useEffect(() => {
    setTasks(post?.tasks || []);
  }, [post]);

  if (loading) {
    return (
      <div className="min-h-full flex items-center justify-center p-6">
        <Card className="p-8 text-center max-w-sm w-full">
          <Loader2 className="size-10 mx-auto mb-4 animate-spin text-primary" />
          <h2 className="mb-2">Chargement du signalement</h2>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-full flex items-center justify-center p-6">
        <Card className="p-8 text-center max-w-sm w-full">
          <AlertCircle className="size-10 mx-auto mb-4 text-destructive" />
          <h2 className="mb-2">Impossible de charger le signalement</h2>
          <p className="text-sm text-muted-foreground">{error.message}</p>
        </Card>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-full flex items-center justify-center p-4">
        <Card className="p-8 text-center">
          <AlertCircle className="size-12 mx-auto mb-4 text-muted-foreground" />
          <h2 className="mb-2">Signalement introuvable</h2>
          <p className="text-muted-foreground mb-4">
            Ce signalement n'existe pas ou a été supprimé.
          </p>
          <Button
            onClick={() => navigate('/')}
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-foreground"
          >
            Retour à la carte
          </Button>
        </Card>
      </div>
    );
  }

  const displayPositive = votesLoading ? post.votes.positive : positiveVotes;
  const displayNegative = votesLoading ? post.votes.negative : negativeVotes;
  const netVotes = displayPositive - displayNegative;
  const syntheticPost = { ...post, votes: { positive: displayPositive, negative: displayNegative } };
  const actualStatus = getActualStatus(syntheticPost);
  const statusConfig = getStatusConfig(actualStatus);
  const StatusIcon = statusConfig.icon;
  
  // Only show incomplete tasks for pending projects, all tasks for in-progress and completed
  const visibleTasks = actualStatus === 'pending' 
    ? tasks.filter(t => !t.completed)
    : tasks;
  
  const completedTasks = tasks.filter((t) => t.completed).length;
  const progress = tasks.length > 0 ? (completedTasks / tasks.length) * 100 : 0;

  // Tasks are only editable when status is in-progress and if user connected is creator of issue
  const canEditTasks = actualStatus === 'in-progress' && user?.id === post.created_by;

  const toggleTask = (taskId: string) => {
    if (!canEditTasks) {
      if (actualStatus === 'pending') {
        toast.info(`Les tâches seront modifiables une fois le projet lancé (objectif de +${VOTE_GOAL} votes atteint)`);
      } else {
        toast.info('Les tâches ne sont plus modifiables pour ce projet terminé');
      }
      return;
    }
    
    setTasks((currentTasks) =>
      currentTasks.map((task) =>
        task.id === taskId ? { ...task, completed: !task.completed } : task,
      ),
    );
    toast.success('Tâche mise à jour');
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: post.title,
        text: post.description,
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success('Lien copié dans le presse-papier');
    }
  };

  const handleCommentSubmit = async () => {
    if (!commentText.trim() || !user) return;
    setSubmitting(true);
    try {
      await addComment(user.id, commentText.trim());
      setCommentText('');
    } catch {
      toast.error('Impossible de publier le commentaire');
    } finally {
      setSubmitting(false);
    }
  };

  const handleVote = async (type: 'positive' | 'negative', _commitment: 'simple' | 'engage' | 'lead') => {
    if (!user || !id) return;
    const yes = type === 'positive';
    try {
      // positive_votes/negative_votes on `issues` are recomputed server-side by a
      // trigger on the `votes` table (see supabase/migrations) — the client must
      // not write them directly, or it could push an arbitrary tally.
      await addVote(user.id, yes);
      toast.success(yes ? 'Vote positif enregistré !' : 'Vote négatif enregistré');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Impossible de voter');
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Supprimer définitivement ce signalement ?')) return;
    try {
      await deleteIssue(post.id);
      toast.success('Signalement supprimé');
      navigate('/');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Impossible de supprimer le signalement');
    }
  };

  return (
    <div className="min-h-full bg-background pb-6">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Button
              onClick={() => navigate('/')}
              variant="ghost"
              size="sm"
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="size-5" />
              <span>Retour</span>
            </Button>
            <div className="flex gap-2">
              <Button
                onClick={handleShare}
                variant="ghost"
                size="sm"
                className="p-2 text-muted-foreground hover:text-foreground"
                aria-label="Partager"
              >
                <Share2 className="size-5" />
              </Button>
              {user?.id === post.created_by && (
                <>
                  <Button
                    onClick={() => navigate(`/create/${post.id}`)}
                    variant="ghost"
                    size="sm"
                    className="p-2 text-muted-foreground hover:text-foreground"
                    aria-label="Modifier le signalement"
                  >
                    <Edit className="size-5" />
                  </Button>
                  <Button
                    onClick={handleDelete}
                    variant="ghost"
                    size="sm"
                    className="p-2 text-destructive hover:text-destructive/80"
                    aria-label="Supprimer le signalement"
                  >
                    <Trash2 className="size-5" />
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 max-w-3xl">
        {/* Image */}
        <div className="mb-6">
          <img
            src={post.imageUrl}
            alt={post.title}
            className="w-full h-80 object-cover rounded-xl shadow-lg"
          />
        </div>

        {/* Title & Status */}
        <div className="mb-6">
          <div className="flex items-start justify-between gap-4 mb-3">
            <h1>{post.title}</h1>
            <div className="flex flex-col gap-2 flex-shrink-0">
              <Badge
                variant="outline"
                className={`${statusConfig.bgColor} ${statusConfig.textColor} border-0 flex items-center gap-1.5 px-3 py-1`}
              >
                <StatusIcon className="size-4" />
                {statusConfig.label}
              </Badge>
              {post.isMunicipalProject && (
                <Badge className={`${MUNICIPAL_GRADIENT_CLASS} text-white border-0 shadow-lg`}>
                  <Building2 className="size-3 mr-1" />
                  Projet Mairie
                </Badge>
              )}
            </div>
          </div>
          <p className="text-muted-foreground">{post.description}</p>
        </div>

        {/* Info Cards */}
        <div className="grid md:grid-cols-2 gap-4 mb-6">
          <Card className="p-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <MapPin className="size-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm text-muted-foreground mb-1">Localisation</h4>
                <p className="text-sm">{post.location.address}</p>
                {post.isPrivateProperty && (
                  <Badge variant="outline" className="flex items-center gap-1 w-fit mt-2">
                    <Home className="size-3" />
                    Voie privée
                  </Badge>
                )}
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Calendar className="size-5 text-primary" />
              </div>
              <div className="flex-1">
                <h4 className="text-sm text-muted-foreground mb-1">Date de signalement</h4>
                <p className="text-sm">
                  {new Date(post.createdAt).toLocaleDateString('fr-FR', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Private Property Info */}
        {post.isPrivateProperty && post.ownerEmail && (
          <Card className="p-4 mb-6 bg-muted/30">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Mail className="size-5 text-primary" />
              </div>
              <div className="flex-1">
                <h4 className="text-sm text-muted-foreground mb-1">Propriétaire notifié</h4>
                <p className="text-sm">{post.ownerEmail}</p>
              </div>
            </div>
          </Card>
        )}

        {/* Vote Section - Only show if not completed */}
        {actualStatus !== 'completed' && (
          <Card className="p-6 mb-6 bg-gradient-to-br from-primary/5 to-accent/5 border-primary/20">
            <div className="flex items-center justify-between mb-4">
              <h2>{actualStatus === 'pending' ? 'Soutien du projet' : 'Votes du projet'}</h2>
              <button onClick={() => setVotersDialogOpen(true)} title="Voir les votants">
                <Badge variant="outline" className="text-lg cursor-pointer hover:bg-accent/50 transition-colors">
                  {netVotes} / {VOTE_GOAL}
                </Badge>
              </button>
            </div>

            <div className="space-y-3 mb-4">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <ThumbsUp className="size-4 text-green-600" />
                  <span className="text-green-600">{displayPositive} votes pour</span>
                </div>
                <div className="flex items-center gap-2">
                  <ThumbsDown className="size-4 text-red-600" />
                  <span className="text-red-600">{displayNegative} votes contre</span>
                </div>
              </div>

              {actualStatus === 'pending' && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{VOTE_GOAL_LABEL}</span>
                    <span>{Math.max(0, VOTE_GOAL - netVotes)} votes pour restants</span>
                  </div>
                  <div className="h-2 bg-background rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all"
                      style={{
                        width: `${Math.min((netVotes / VOTE_GOAL) * 100, 100)}%`
                      }}
                    />
                  </div>
                </div>
              )}

              {actualStatus === 'in-progress' && (
                <div className="flex items-center gap-2 p-3 bg-amber-50 rounded-lg text-sm text-amber-700">
                  <CheckCircle2 className="size-4 flex-shrink-0" />
                  <span>Projet lancé ! Les travaux peuvent commencer.</span>
                </div>
              )}
            </div>

            {actualStatus === 'pending' && (
              hasVoted ? (
                <p className="text-center text-sm text-muted-foreground py-2">Vous avez déjà voté pour ce projet.</p>
              ) : (
                <button
                  onClick={() => setVoteDialogOpen(true)}
                  className="w-full px-4 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
                >
                  <ThumbsUp className="size-5" />
                  Voter pour ce projet
                </button>
              )
            )}
          </Card>
        )}

        {/* Materials Section */}
        {post.materials && post.materials.length > 0 && (
          <Card className="p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <Package className="size-5 text-primary" />
              <h2>Matériel nécessaire</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {post.materials.map((material, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg"
                >
                  <Package className="size-4 text-primary flex-shrink-0" />
                  <span className="text-sm">{material}</span>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Tasks Section */}
        {visibleTasks.length > 0 && (
          <Card className="p-6 mb-6">
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <h2>Tâches à effectuer</h2>
                {actualStatus !== 'pending' && (
                  <span className="text-sm text-muted-foreground">
                    {completedTasks}/{tasks.length}
                  </span>
                )}
              </div>
              {actualStatus !== 'pending' && (
                <Progress value={progress} className="h-2" aria-label="Progression des tâches" />
              )}
              
              {!canEditTasks && actualStatus === 'pending' && (
                <div className="flex items-start gap-2 p-3 mt-3 bg-blue-50 rounded-lg text-sm text-blue-700">
                  <Info className="size-4 mt-0.5 flex-shrink-0" />
                  <span>Les tâches seront visibles et modifiables une fois l'objectif de +{VOTE_GOAL} votes atteint.</span>
                </div>
              )}
            </div>

            <div className="space-y-3">
              {visibleTasks.map((task) => (
                <div
                  key={task.id}
                  role="checkbox"
                  aria-checked={task.completed}
                  aria-disabled={!canEditTasks}
                  tabIndex={0}
                  onClick={() => toggleTask(task.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      toggleTask(task.id);
                    }
                  }}
                  className={`flex items-start gap-3 p-4 rounded-lg border transition-all outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 ${
                    canEditTasks ? 'cursor-pointer' : 'cursor-not-allowed opacity-75'
                  } ${
                    task.completed
                      ? 'bg-muted/30 border-primary/20'
                      : 'bg-card border-border hover:border-primary/40'
                  }`}
                >
                  <div
                    className={`mt-0.5 size-6 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                      task.completed
                        ? 'bg-primary border-primary'
                        : 'border-muted-foreground hover:border-primary'
                    }`}
                  >
                    {task.completed && <CheckCircle2 className="size-4 text-primary-foreground" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className={`transition-all ${
                        task.completed ? 'line-through text-muted-foreground' : ''
                      }`}
                    >
                      {task.title}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Comments Section */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <MessageSquare className="size-5 text-primary" />
            <h2>Commentaires</h2>
            <Badge variant="secondary" className="ml-auto">
              {comments.length}
            </Badge>
          </div>

          {commentsError && (
            <p className="text-sm text-destructive mb-4">{commentsError.message}</p>
          )}

          {commentsLoading && (
            <p className="text-sm text-muted-foreground mb-4">Chargement des commentaires…</p>
          )}

          {!commentsLoading && !commentsError && comments.length === 0 && (
            <p className="text-sm text-muted-foreground mb-4">Aucun commentaire pour l'instant.</p>
          )}

          {comments.length > 0 && (
            <div className="space-y-4 mb-4">
              {comments.map((comment) => {
                const isMe = comment.id_user === user?.id;
                const { label: authorLabel, avatar: avatarChar } = getVoterIdentity(isMe, user?.name);
                return (
                  <div key={comment.id} className="border-l-2 border-primary/30 pl-4">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-medium">
                        {avatarChar}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{authorLabel}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(comment.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </p>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">{comment.comment}</p>
                  </div>
                );
              })}
            </div>
          )}

          {user && (
            <div className="pt-4 border-t border-border">
              <label htmlFor="comment-text" className="sr-only">
                Ajouter un commentaire
              </label>
              <textarea
                id="comment-text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Ajouter un commentaire..."
                className="w-full p-3 bg-input-background rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                rows={3}
              />
              <div className="flex justify-end mt-2">
                <button
                  onClick={handleCommentSubmit}
                  disabled={submitting || !commentText.trim()}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Publication...' : 'Publier'}
                </button>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Vote Dialog */}
      <VoteDialog
        isOpen={voteDialogOpen}
        onClose={() => setVoteDialogOpen(false)}
        onVote={handleVote}
        postTitle={post.title}
        currentVotes={{ positive: displayPositive, negative: displayNegative }}
      />

      {/* Voters Dialog */}
      <Dialog open={votersDialogOpen} onOpenChange={setVotersDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Votants ({votes.length})</DialogTitle>
          </DialogHeader>
          <div className="space-y-1 max-h-80 overflow-y-auto pr-1">
            {votes.length === 0 && (
              <p className="text-sm text-muted-foreground py-2">Aucun vote pour l'instant.</p>
            )}
            {votes.map((vote) => {
              const isMe = vote.id_user === user?.id;
              const { label: voterLabel, avatar: voterAvatar } = getVoterIdentity(isMe, user?.name);
              return (
                <div key={vote.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div className="flex items-center gap-2">
                    <div className="size-7 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-medium">
                      {voterAvatar}
                    </div>
                    <span className="text-sm">{voterLabel}</span>
                  </div>
                  {vote.yes ? (
                    <span className="text-xs text-green-600 flex items-center gap-1">
                      <ThumbsUp className="size-3" /> Pour
                    </span>
                  ) : (
                    <span className="text-xs text-red-600 flex items-center gap-1">
                      <ThumbsDown className="size-3" /> Contre
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}