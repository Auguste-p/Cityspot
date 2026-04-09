import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { mockPosts } from '../data/mockPosts';
import { Post } from '../types/Post';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { MapPin, Calendar, CheckCircle2, Clock, AlertCircle, ThumbsUp, ThumbsDown, Home, Vote, Building2 } from 'lucide-react';
import { VoteDialog } from './VoteDialog';
import { toast } from 'sonner';
import { getActualStatus, getNetVotes, getStatusConfig } from '../lib/postStatus';

const MARKER_POSITIONS = [
  { top: '25%', left: '35%' },
  { top: '45%', left: '55%' },
  { top: '35%', left: '70%' },
  { top: '60%', left: '40%' },
  { top: '55%', left: '65%' },
] as const;

export function MapView() {
  const navigate = useNavigate();
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [hoveredPost, setHoveredPost] = useState<string | null>(null);
  const [voteDialogOpen, setVoteDialogOpen] = useState(false);
  const [votingPost, setVotingPost] = useState<Post | null>(null);

  const selectedStatus = useMemo(
    () => (selectedPost ? getActualStatus(selectedPost) : null),
    [selectedPost],
  );
  const selectedStatusConfig = useMemo(
    () => (selectedStatus ? getStatusConfig(selectedStatus) : null),
    [selectedStatus],
  );
  const SelectedStatusIcon = selectedStatusConfig?.icon;

  const handleVote = (post: Post) => {
    setVotingPost(post);
    setVoteDialogOpen(true);
  };

  const handleVoteSubmit = (type: 'positive' | 'negative', commitment: 'simple' | 'engage' | 'lead') => {
    const commitmentLabels = {
      simple: 'une proposition simple',
      engage: 'un engagement',
      lead: 'le lead du projet'
    };
    
    toast.success(
      type === 'positive'
        ? `Vote positif enregistré avec ${commitmentLabels[commitment]} ! 👍`
        : 'Vote négatif enregistré 👎'
    );
  };

  return (
    <div className="h-full flex flex-col lg:flex-row">
      {/* Map Area */}
      <div className="relative flex-1 bg-muted">
        {/* Mock Map Background */}
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-30"
          style={{
            backgroundImage: 'url(https://images.unsplash.com/photo-1524661135-423995f22d0b?w=1200&h=800&fit=crop)',
          }}
        />
        
        {/* Map Overlay */}
        <div className="relative h-full min-h-[400px] lg:min-h-screen overflow-hidden">
          {/* Grid lines for map effect */}
          <div className="absolute inset-0 opacity-10 pointer-events-none" aria-hidden="true">
            <div
              className="h-full w-full"
              style={{
                backgroundImage:
                  'linear-gradient(to right, rgba(37, 99, 235, 0.2) 1px, transparent 1px), linear-gradient(to bottom, rgba(37, 99, 235, 0.2) 1px, transparent 1px)',
                backgroundSize: 'calc(100% / 12) 100%, 100% calc(100% / 12)',
              }}
            />
          </div>

          {/* Map Markers */}
          <div className="absolute inset-0 p-8">
            {mockPosts.map((post, index) => {
              const actualStatus = getActualStatus(post);
              const statusConfig = getStatusConfig(actualStatus);
              const StatusIcon = statusConfig.icon;
              const position = MARKER_POSITIONS[index % MARKER_POSITIONS.length];

              return (
                <div
                  key={post.id}
                  className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-all duration-200"
                  style={position}
                  onMouseEnter={() => setHoveredPost(post.id)}
                  onMouseLeave={() => setHoveredPost(null)}
                  onClick={() => setSelectedPost(post)}
                >
                  <div
                    className={`relative transition-all duration-200 ${
                      hoveredPost === post.id || selectedPost?.id === post.id
                        ? 'scale-125'
                        : 'scale-100'
                    }`}
                  >
                    <MapPin
                      className={`size-10 drop-shadow-lg ${
                        selectedPost?.id === post.id
                          ? 'text-primary fill-primary'
                          : 'text-accent fill-accent'
                      }`}
                    />
                    <div
                      className={`absolute top-2 left-1/2 transform -translate-x-1/2 size-3 rounded-full ${
                        statusConfig.color
                      }`}
                    />
                    {post.isPrivateProperty && (
                      <div className="absolute -top-1 -right-1">
                        <Home className="size-4 text-primary fill-primary drop-shadow-lg" />
                      </div>
                    )}
                  </div>

                  {/* Hover tooltip */}
                  {hoveredPost === post.id && !selectedPost && (
                    <div className="absolute top-full mt-2 left-1/2 transform -translate-x-1/2 bg-card p-2 rounded-lg shadow-lg whitespace-nowrap z-10 border border-border">
                      <p className="text-sm">{post.title}</p>
                      {post.isPrivateProperty && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                          <Home className="size-3" />
                          Voie privée
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="absolute top-4 right-4 bg-card/95 backdrop-blur-sm p-4 rounded-lg shadow-lg border border-border">
            <h3 className="mb-2">Statut</h3>
            <div className="space-y-1.5">
              {(['pending', 'in-progress', 'completed'] as const).map((status) => {
                const config = getStatusConfig(status);
                const Icon = config.icon;
                return (
                  <div key={status} className="flex items-center gap-2 text-sm">
                    <div className={`size-3 rounded-full ${config.color}`} />
                    <Icon className="size-4 text-muted-foreground" />
                    <span>{config.label}</span>
                  </div>
                );
              })}
              <div className="flex items-center gap-2 text-sm pt-2 border-t border-border mt-2">
                <Home className="size-4 text-primary" />
                <span>Voie privée</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Details Panel */}
      <div className="lg:w-96 bg-background border-t lg:border-t-0 lg:border-l border-border overflow-y-auto">
        {selectedPost ? (
          <div className="p-6">
            <Card className="overflow-hidden">
              <img
                src={selectedPost.imageUrl}
                alt={selectedPost.title}
                className="w-full h-48 object-cover"
              />
              <div className="p-4 space-y-4">
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h2>{selectedPost.title}</h2>
                    <div className="flex flex-col gap-1">
                      {selectedStatusConfig && (
                        <Badge
                          variant="outline"
                          className={`${selectedStatusConfig.bgColor} ${selectedStatusConfig.textColor} border-0 flex items-center gap-1.5`}
                        >
                          {SelectedStatusIcon && <SelectedStatusIcon className="size-3" />}
                          {selectedStatusConfig.label}
                        </Badge>
                      )}
                      {selectedPost.isMunicipalProject && (
                        <Badge className="bg-gradient-to-r from-blue-600 to-blue-500 text-white border-0">
                          <Building2 className="size-3 mr-1" />
                          Mairie
                        </Badge>
                      )}
                      {selectedPost.isPrivateProperty && (
                        <Badge variant="outline" className="flex items-center gap-1">
                          <Home className="size-3" />
                          Privé
                        </Badge>
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">{selectedPost.description}</p>
                </div>

                <div className="flex items-start gap-2 text-sm">
                  <MapPin className="size-4 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-muted-foreground">{selectedPost.location.address}</span>
                </div>

                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="size-4" />
                  <span>
                    {new Date(selectedPost.createdAt).toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </span>
                </div>

                {/* Vote Section - Only for pending and in-progress */}
                {selectedStatus !== 'completed' && (
                  <div className="space-y-2 p-3 bg-muted/30 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Votes</span>
                      <div className="flex items-center gap-3 text-sm">
                        <div className="flex items-center gap-1 text-green-600">
                          <ThumbsUp className="size-4" />
                          <span>{selectedPost.votes.positive}</span>
                        </div>
                        <div className="flex items-center gap-1 text-red-600">
                          <ThumbsDown className="size-4" />
                          <span>{selectedPost.votes.negative}</span>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Objectif: +10</span>
                        <span>{getNetVotes(selectedPost)} / 10</span>
                      </div>
                      <div className="h-1.5 bg-background rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary transition-all"
                          style={{
                            width: `${Math.min((getNetVotes(selectedPost) / 10) * 100, 100)}%`
                          }}
                        />
                      </div>
                    </div>
                    {selectedStatus === 'pending' && (
                      <Button
                        onClick={() => handleVote(selectedPost)}
                        variant="secondary"
                        className="mt-2 w-full flex items-center justify-center gap-2"
                      >
                        <ThumbsUp className="size-4" />
                        Voter pour ce projet
                      </Button>
                    )}
                    {selectedStatus === 'in-progress' && (
                      <div className="flex items-center gap-2 p-2 bg-amber-50 rounded-lg text-xs text-amber-700 mt-2">
                        <CheckCircle2 className="size-4 flex-shrink-0" />
                        <span>Projet lancé !</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Tasks - Only show for in-progress and completed */}
                {selectedStatus !== 'pending' && (
                  <div>
                    <h3 className="mb-2">Tâches ({selectedPost.tasks.filter(t => t.completed).length}/{selectedPost.tasks.length})</h3>
                    <ul className="space-y-2">
                      {selectedPost.tasks.slice(0, 3).map((task) => (
                        <li key={task.id} className="flex items-center gap-2 text-sm">
                          <div
                            className={`size-4 rounded-sm border-2 flex items-center justify-center ${
                              task.completed
                                ? 'bg-primary border-primary'
                                : 'border-muted-foreground'
                            }`}
                          >
                            {task.completed && <CheckCircle2 className="size-3 text-primary-foreground" />}
                          </div>
                          <span className={task.completed ? 'line-through text-muted-foreground' : ''}>
                            {task.title}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <Button
                  onClick={() => navigate(`/post/${selectedPost.id}`)}
                  className="w-full"
                >
                  Voir les détails
                </Button>
              </div>
            </Card>
          </div>
        ) : (
          <div className="p-6 h-full flex flex-col">
            <div className="flex-1 flex items-center justify-center text-center text-muted-foreground">
              <div>
                <MapPin className="size-12 mx-auto mb-4 text-primary/30" />
                <p>Cliquez sur un marqueur</p>
                <p className="text-sm">pour voir les détails</p>
              </div>
            </div>

            {/* List of all posts */}
            <div className="space-y-3 mt-6">
              <h3>Tous les signalements</h3>
              {mockPosts.map((post) => {
                const actualStatus = getActualStatus(post);
                const statusConfig = getStatusConfig(actualStatus);
                const StatusIcon = statusConfig.icon;
                return (
                  <Card
                    key={post.id}
                    className="p-3 cursor-pointer hover:bg-accent/50 transition-colors"
                    onClick={() => setSelectedPost(post)}
                  >
                    <div className="flex gap-3">
                      <img
                        src={post.imageUrl}
                        alt={post.title}
                        className="w-16 h-16 object-cover rounded"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start gap-2">
                          <h4 className="text-sm truncate flex-1">{post.title}</h4>
                          <div className="flex gap-1 flex-shrink-0">
                            {post.isMunicipalProject && (
                              <div className="flex items-center justify-center p-0.5 bg-gradient-to-r from-blue-600 to-blue-500 rounded" title="Projet Mairie">
                                <Building2 className="size-3 text-white" />
                              </div>
                            )}
                            {post.isPrivateProperty && (
                              <Home className="size-3 text-primary flex-shrink-0 mt-0.5" />
                            )}
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {post.location.address.split(',')[0]}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge 
                            variant="outline" 
                            className={`text-xs ${statusConfig.bgColor} ${statusConfig.textColor} border-0 flex items-center gap-1`}
                          >
                            <StatusIcon className="size-2.5" />
                            {statusConfig.label}
                          </Badge>
                          <div className="flex items-center gap-1 text-xs text-green-600">
                            <ThumbsUp className="size-3" />
                            <span>{post.votes.positive}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Vote Dialog */}
      {votingPost && (
        <VoteDialog
          isOpen={voteDialogOpen}
          onClose={() => {
            setVoteDialogOpen(false);
            setVotingPost(null);
          }}
          onVote={handleVoteSubmit}
          postTitle={votingPost.title}
          currentVotes={votingPost.votes}
        />
      )}
    </div>
  );
}