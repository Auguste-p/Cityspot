import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { Card } from './ui/card';
import { AlertCircle, Loader2 } from 'lucide-react';
import { VOTE_GOAL, getNetVotes } from '../lib/postStatus';
import { useUser } from '../context/UserContext';
import { useIssues, useRevokedIssues, useUserVotes } from '../hooks/useIssues';
import { getUserProfile } from '../services/authService';
import { ProfileView } from './ProfileView';

export function Profile() {
  const navigate = useNavigate();
  const { user, isMunicipalUser } = useUser();
  const { issues, loading, error } = useIssues();
  const { votes: userVotes, loading: userVotesLoading } = useUserVotes(user?.id);
  const { issues: revokedPosts, loading: revokedLoading } = useRevokedIssues(user?.id);
  const myPosts = issues.filter((post) => post.created_by === user?.id);
  const votedPostIds = new Set(userVotes.map((vote) => vote.id_issue));
  const votedPosts = issues.filter((post) => votedPostIds.has(post.id));
  const [profileName, setProfileName] = useState<string | null>(null);
  const [cityName, setCityName] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    getUserProfile(user.id)
      .then((profile) => {
        setProfileName(profile?.name ?? null);
        setCityName(profile?.city ?? null);
      })
      .catch(() => {
        setProfileName(null);
        setCityName(null);
      });
    // `user?.id` on purpose, not `user`: the user object gets a new reference
    // on every auth-state event (token refresh, initial session), which would
    // otherwise re-run this fetch needlessly.
  }, [user?.id]);

  const votingPosts = myPosts.filter((p) => {
    const netVotes = getNetVotes(p);
    return p.status === 'pending' && netVotes < VOTE_GOAL;
  });

  const inProgressPosts = myPosts.filter((p) => {
    const netVotes = getNetVotes(p);
    return p.status === 'in-progress' || (p.status === 'pending' && netVotes >= VOTE_GOAL);
  });

  const completedPosts = myPosts.filter((p) => p.status === 'completed');

  if (loading || userVotesLoading || revokedLoading) {
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

  return (
    <ProfileView
      name={profileName ?? user?.name ?? null}
      avatarUrl={user?.avatar || null}
      city={cityName}
      isMunicipal={isMunicipalUser}
      allPosts={myPosts}
      votingPosts={votingPosts}
      inProgressPosts={inProgressPosts}
      completedPosts={completedPosts}
      votedPosts={votedPosts}
      revokedPosts={revokedPosts}
      onSettingsClick={() => navigate('/settings')}
      onPostClick={(postId) => navigate(`/post/${postId}`)}
    />
  );
}
