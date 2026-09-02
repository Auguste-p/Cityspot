import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Card } from './ui/card';
import { AlertCircle, Loader2, Lock } from 'lucide-react';
import { VOTE_GOAL, getNetVotes } from '../lib/postStatus';
import { useIssues, useUserVotes } from '../hooks/useIssues';
import { getPublicProfile } from '../services/authService';
import { ProfileView } from './ProfileView';

export function PublicProfile() {
  const navigate = useNavigate();
  const { id: profileId } = useParams<{ id: string }>();
  const { issues, loading, error } = useIssues();
  const { votes: userVotes, loading: userVotesLoading } = useUserVotes(profileId);
  const myPosts = issues.filter((post) => post.created_by === profileId);
  const votedPostIds = new Set(userVotes.map((vote) => vote.id_issue));
  const votedPosts = issues.filter((post) => votedPostIds.has(post.id));

  const [profile, setProfile] = useState<{ name: string | null; avatar: string | null; city: string | null; role: string } | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  useEffect(() => {
    if (!profileId) return;
    setProfileLoading(true);
    getPublicProfile(profileId)
      .then((data) => setProfile(data))
      .catch(() => setProfile(null))
      .finally(() => setProfileLoading(false));
  }, [profileId]);

  const votingPosts = myPosts.filter((p) => {
    const netVotes = getNetVotes(p);
    return p.status === 'pending' && netVotes < VOTE_GOAL;
  });

  const inProgressPosts = myPosts.filter((p) => {
    const netVotes = getNetVotes(p);
    return p.status === 'in-progress' || (p.status === 'pending' && netVotes >= VOTE_GOAL);
  });

  const completedPosts = myPosts.filter((p) => p.status === 'completed');

  if (loading || userVotesLoading || profileLoading) {
    return (
      <div className="min-h-full flex items-center justify-center p-6">
        <Card className="p-8 text-center max-w-sm w-full">
          <Loader2 className="size-10 mx-auto mb-4 animate-spin text-primary" />
          <h2 className="mb-2">Chargement du profil</h2>
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

  if (!profile) {
    return (
      <div className="min-h-full flex items-center justify-center p-6">
        <Card className="p-8 text-center max-w-sm w-full">
          <Lock className="size-10 mx-auto mb-4 text-muted-foreground" />
          <h2 className="mb-2">Ce profil est privé</h2>
          <p className="text-sm text-muted-foreground">Cet utilisateur n'a pas rendu son profil public.</p>
        </Card>
      </div>
    );
  }

  return (
    <ProfileView
      name={profile.name}
      avatarUrl={profile.avatar}
      city={profile.city}
      isMunicipal={profile.role === 'municipal'}
      allPosts={myPosts}
      votingPosts={votingPosts}
      inProgressPosts={inProgressPosts}
      completedPosts={completedPosts}
      votedPosts={votedPosts}
      onPostClick={(postId) => navigate(`/post/${postId}`)}
    />
  );
}
