import { Card } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Settings, MapPin, CheckCircle2, Clock, Award, TrendingUp, Vote, Building2 } from 'lucide-react';
import { PostCard } from './PostCard';
import { Badge } from './ui/badge';
import { EMPTY_STATE_LABELS, MUNICIPAL_GRADIENT_CLASS } from '../lib/postStatus';
import type { Post } from '../types/Post';

interface ProfileViewProps {
  name: string | null;
  avatarUrl: string | null;
  city: string | null;
  isMunicipal: boolean;
  allPosts: Post[];
  votingPosts: Post[];
  inProgressPosts: Post[];
  completedPosts: Post[];
  votedPosts: Post[];
  // Absent = pas de bouton réglages (profil public, en lecture seule).
  onSettingsClick?: () => void;
  onPostClick: (postId: string) => void;
}

// Affichage partagé entre Profile.tsx (son propre profil) et PublicProfile.tsx
// (profil d'un autre membre) : en-tête, badges, onglets — tout ce qui ne dépend
// pas de la façon dont les données ont été récupérées. Les deux pages restent
// séparées côté données (contexte auth + RLS "own row" vs vue publique
// filtrée) ; seul ce rendu, identique dans les deux cas, est mutualisé.
export function ProfileView({
  name,
  avatarUrl,
  city,
  isMunicipal,
  allPosts,
  votingPosts,
  inProgressPosts,
  completedPosts,
  votedPosts,
  onSettingsClick,
  onPostClick,
}: ProfileViewProps) {
  return (
    <div className="min-h-full bg-background pb-6">
      <div className="bg-gradient-to-b from-primary to-primary/90 text-primary-foreground">
        <div className="container mx-auto px-4 py-6">
          {onSettingsClick && (
            <div className="flex justify-end mb-4">
              <button
                onClick={onSettingsClick}
                className="p-2 hover:bg-primary-foreground/10 rounded-lg transition-colors"
                aria-label="Paramètres"
              >
                <Settings className="size-5" />
              </button>
            </div>
          )}

          <div className="flex flex-col items-center text-center">
            <div className="size-20 rounded-full bg-primary-foreground/20 flex items-center justify-center mb-3 backdrop-blur-sm border-2 border-primary-foreground/30 overflow-hidden">
              {avatarUrl ? (
                <img src={avatarUrl} alt="" className="size-full object-cover" />
              ) : (
                <span className="text-2xl">{name?.[0]?.toUpperCase()}</span>
              )}
            </div>
            {isMunicipal && (
              <Badge className={`${MUNICIPAL_GRADIENT_CLASS} text-white border-0 shadow-lg mb-2`}>
                <Building2 className="size-3 mr-1" />
                Mairie
              </Badge>
            )}
            <h1 className="mb-1">{name ?? ''}</h1>
            <p className="text-primary-foreground/80 text-sm mb-4">{city ?? ''}</p>

            <div className="flex gap-6 mt-2">
              <div className="text-center">
                <div className="text-2xl mb-1">{allPosts.length}</div>
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

        <Tabs defaultValue="all" className="w-full">
          <TabsList className="grid w-full grid-cols-5 mb-6">
            <TabsTrigger value="all">Tous ({allPosts.length})</TabsTrigger>
            <TabsTrigger value="voting">En vote ({votingPosts.length})</TabsTrigger>
            <TabsTrigger value="in-progress">En cours ({inProgressPosts.length})</TabsTrigger>
            <TabsTrigger value="completed">Terminés ({completedPosts.length})</TabsTrigger>
            <TabsTrigger value="voted">Votés ({votedPosts.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-4">
            {allPosts.length > 0 ? (
              allPosts.map((post) => <PostCard key={post.id} post={post} onClick={() => onPostClick(post.id)} />)
            ) : (
              <Card className="p-8 text-center">
                <MapPin className="size-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">Aucun signalement pour le moment</p>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="voting" className="space-y-4">
            {votingPosts.length > 0 ? (
              votingPosts.map((post) => <PostCard key={post.id} post={post} onClick={() => onPostClick(post.id)} />)
            ) : (
              <Card className="p-8 text-center">
                <Vote className="size-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">{EMPTY_STATE_LABELS.voting}</p>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="in-progress" className="space-y-4">
            {inProgressPosts.length > 0 ? (
              inProgressPosts.map((post) => <PostCard key={post.id} post={post} onClick={() => onPostClick(post.id)} />)
            ) : (
              <Card className="p-8 text-center">
                <Clock className="size-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">{EMPTY_STATE_LABELS.inProgress}</p>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="completed" className="space-y-4">
            {completedPosts.length > 0 ? (
              completedPosts.map((post) => <PostCard key={post.id} post={post} onClick={() => onPostClick(post.id)} />)
            ) : (
              <Card className="p-8 text-center">
                <CheckCircle2 className="size-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">{EMPTY_STATE_LABELS.completed}</p>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="voted" className="space-y-4">
            {votedPosts.length > 0 ? (
              votedPosts.map((post) => <PostCard key={post.id} post={post} onClick={() => onPostClick(post.id)} />)
            ) : (
              <Card className="p-8 text-center">
                <Vote className="size-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">{EMPTY_STATE_LABELS.voted}</p>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
