import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { Card } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import {
  Settings,
  MapPin,
  CheckCircle2,
  Clock,
  AlertCircle,
  TrendingUp,
  Award,
  Vote,
  Loader2,
  Building2,
} from 'lucide-react';
import { PostCard } from './PostCard';
import { Badge } from './ui/badge';
import { EMPTY_STATE_LABELS, MUNICIPAL_GRADIENT_CLASS, VOTE_GOAL, getNetVotes } from '../lib/postStatus';
import { useUser } from '../context/UserContext';
import { useIssues } from '../hooks/useIssues';
import { getUserProfile } from '../services/authService';

export function Profile() {
  const navigate = useNavigate();
  const { user } = useUser();
  const { issues, loading, error } = useIssues();
  const myPosts = issues.filter((post) => post.created_by === user?.id);
  const [profileName, setProfileName] = useState<string | null>(null);
  const [cityName, setCityName] = useState<string | null>(null);
  const [isCityWorker, setIsCityWorker] = useState(false);

  useEffect(() => {
    if (!user) return;
    getUserProfile(user.id)
      .then((profile) => {
        setProfileName(profile?.name ?? null);
        setCityName(profile?.city ?? null);
        setIsCityWorker(profile?.cityWorker ?? false);
      })
      .catch(() => {
        setProfileName(null);
        setCityName(null);
        setIsCityWorker(false);
      });
  }, [user?.id]);

  const votingPosts = myPosts.filter(p => {
    const netVotes = getNetVotes(p);
    return p.status === 'pending' && netVotes < VOTE_GOAL;
  });

  const inProgressPosts = myPosts.filter(p => {
    const netVotes = getNetVotes(p);
    return p.status === 'in-progress' || (p.status === 'pending' && netVotes >= VOTE_GOAL);
  });
  
  const completedPosts = myPosts.filter(p => p.status === 'completed');

  if (loading) {
    return (
      <div className="min-h-full flex items-center justify-center p-6">
        <Card className="p-8 text-center max-w-sm w-full">
          <Loader2 className="size-10 mx-auto mb-4 animate-spin text-primary" />
          <h2 className="mb-2">Chargement du profil</h2>
          <p className="text-sm text-muted-foreground">Récupération des signalements.</p>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-full flex items-center justify-center p-6">
        <Card className="p-8 text-center max-w-sm w-full">
          <AlertCircle className="size-10 mx-auto mb-4 text-destructive" />
          <h2 className="mb-2">Impossible de charger le profil</h2>
          <p className="text-sm text-muted-foreground">{error.message}</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-background pb-6">
      {/* Header with Settings Button */}
      <div className="bg-gradient-to-b from-primary to-primary/90 text-primary-foreground">
        <div className="container mx-auto px-4 py-6">
          <div className="flex justify-end mb-4">
            <button
              onClick={() => navigate('/settings')}
              className="p-2 hover:bg-primary-foreground/10 rounded-lg transition-colors"
              aria-label="Paramètres"
            >
              <Settings className="size-5" />
            </button>
          </div>
          
          <div className="flex flex-col items-center text-center">
            <div className="size-20 rounded-full bg-primary-foreground/20 flex items-center justify-center mb-3 backdrop-blur-sm border-2 border-primary-foreground/30">
              <span className="text-2xl">{user?.avatar}</span>
            </div>
            {isCityWorker && (
              <Badge className={`${MUNICIPAL_GRADIENT_CLASS} text-white border-0 shadow-lg mb-2`}>
                <Building2 className="size-3 mr-1" />
                Mairie
              </Badge>
            )}
            <h1 className="mb-1">{profileName ?? ''}</h1>
            <p className="text-primary-foreground/80 text-sm mb-4">{cityName ?? ''}</p>
            
            {/* Stats */}
            <div className="flex gap-6 mt-2">
              <div className="text-center">
                <div className="text-2xl mb-1">{myPosts.length}</div>
                <div className="text-xs text-primary-foreground/80">Signalements</div>
              </div>
              <div className="text-center">
                <div className="text-2xl mb-1">{completedPosts.length}</div>
                <div className="text-xs text-primary-foreground/80">Terminés</div>
              </div>
              <div className="text-center">
                <div className="text-2xl mb-1">{inProgressPosts.length}</div>
                <div className="text-xs text-primary-foreground/80">En cours</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 max-w-4xl">
        {/* Achievement Cards */}
        <div className="grid md:grid-cols-2 gap-4 mb-6">
          <Card className="p-4 bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-amber-100 rounded-lg">
                <Award className="size-6 text-amber-600" />
              </div>
              <div>
                <h3 className="text-sm text-amber-900">Contributeur actif</h3>
                {/* <p className="text-xs text-amber-700 mt-1">
                  Membre depuis {user?.joinDate ? new Date(user.joinDate).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }) : 'inconnue'}
                </p> */}
              </div>
            </div>
          </Card>

          <Card className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-100 rounded-lg">
                <TrendingUp className="size-6 text-green-600" />
              </div>
              <div>
                <h3 className="text-sm text-green-900">Impact positif</h3>
                <p className="text-xs text-green-700 mt-1">
                  {completedPosts.reduce((acc, p) => acc + p.tasks.length, 0)} tâches accomplies
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Tabs for different post statuses */}
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="all">
              Tous ({myPosts.length})
            </TabsTrigger>
            <TabsTrigger value="voting">
              En vote ({votingPosts.length})
            </TabsTrigger>
            <TabsTrigger value="in-progress">
              En cours ({inProgressPosts.length})
            </TabsTrigger>
            <TabsTrigger value="completed">
              Terminés ({completedPosts.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-4">
            {myPosts.length > 0 ? (
              myPosts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  onClick={() => navigate(`/post/${post.id}`)}
                />
              ))
            ) : (
              <Card className="p-8 text-center">
                <MapPin className="size-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">Aucun signalement pour le moment</p>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="voting" className="space-y-4">
            {votingPosts.length > 0 ? (
              votingPosts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  onClick={() => navigate(`/post/${post.id}`)}
                />
              ))
            ) : (
              <Card className="p-8 text-center">
                <Vote className="size-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">{EMPTY_STATE_LABELS.voting}</p>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="in-progress" className="space-y-4">
            {inProgressPosts.length > 0 ? (
              inProgressPosts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  onClick={() => navigate(`/post/${post.id}`)}
                />
              ))
            ) : (
              <Card className="p-8 text-center">
                <Clock className="size-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">{EMPTY_STATE_LABELS.inProgress}</p>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="completed" className="space-y-4">
            {completedPosts.length > 0 ? (
              completedPosts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  onClick={() => navigate(`/post/${post.id}`)}
                />
              ))
            ) : (
              <Card className="p-8 text-center">
                <CheckCircle2 className="size-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">{EMPTY_STATE_LABELS.completed}</p>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}