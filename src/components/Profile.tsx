import { useState } from 'react';
import { useNavigate } from 'react-router';
import { mockPosts } from '../data/mockPosts';
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
} from 'lucide-react';
import { PostCard } from './PostCard';
import { getNetVotes } from '../lib/postStatus';
import { useUser } from '../context/UserContext';

export function Profile() {
  const navigate = useNavigate();
  const { user } = useUser();

  const myPosts = mockPosts; // In a real app, filter by user
  
  const votingPosts = myPosts.filter(p => {
    const netVotes = getNetVotes(p);
    return p.status === 'pending' && netVotes < 10;
  });
  
  const inProgressPosts = myPosts.filter(p => {
    const netVotes = getNetVotes(p);
    return p.status === 'in-progress' || (p.status === 'pending' && netVotes >= 10);
  });
  
  const completedPosts = myPosts.filter(p => p.status === 'completed');

  return (
    <div className="min-h-full bg-background pb-6">
      {/* Header with Settings Button */}
      <div className="bg-gradient-to-b from-primary to-primary/90 text-primary-foreground">
        <div className="container mx-auto px-4 py-6">
          <div className="flex justify-end mb-4">
            <button
              onClick={() => navigate('/settings')}
              className="p-2 hover:bg-primary-foreground/10 rounded-lg transition-colors"
            >
              <Settings className="size-5" />
            </button>
          </div>
          
          <div className="flex flex-col items-center text-center">
            <div className="size-20 rounded-full bg-primary-foreground/20 flex items-center justify-center mb-3 backdrop-blur-sm border-2 border-primary-foreground/30">
              <span className="text-2xl">{user.avatar}</span>
            </div>
            <h1 className="mb-1">{user.name}</h1>
            <p className="text-primary-foreground/80 text-sm mb-4">{user.email}</p>
            
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
                <p className="text-xs text-amber-700 mt-1">
                  Membre depuis {new Date(user.joinDate).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
                </p>
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
                <p className="text-muted-foreground">Aucun signalement en cours de vote</p>
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
                <p className="text-muted-foreground">Aucun signalement en cours</p>
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
                <p className="text-muted-foreground">Aucun signalement terminé</p>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}