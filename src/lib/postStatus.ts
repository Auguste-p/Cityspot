import { CheckCircle2, Clock, Vote, type LucideIcon } from 'lucide-react';
import type { Post } from '../types/Post';

export type PostDisplayStatus = Post['status'];

export const VOTE_GOAL = 10;
export const VOTE_GOAL_LABEL = `Objectif: +${VOTE_GOAL} votes`;

export const MUNICIPAL_GRADIENT_CLASS = 'bg-gradient-to-r from-blue-600 to-blue-500';

export const STATUS_MARKER_COLORS: Record<PostDisplayStatus, string> = {
  pending: '#3b82f6',
  'in-progress': '#f59e0b',
  completed: '#22c55e',
};

export const EMPTY_STATE_LABELS = {
  voting: 'Aucun signalement en cours de vote',
  inProgress: 'Aucun signalement en cours',
  completed: 'Aucun signalement terminé',
} as const;

export interface StatusConfig {
  label: string;
  icon: LucideIcon;
  color: string;
  textColor: string;
  bgColor: string;
}

export const getNetVotes = (post: Pick<Post, 'votes'>) => {
  return post.votes.positive - post.votes.negative;
};

export const getActualStatus = (
  post: Pick<Post, 'status' | 'votes'>,
): PostDisplayStatus => {
  if (post.status === 'completed') {
    return 'completed';
  }

  return getNetVotes(post) >= VOTE_GOAL ? 'in-progress' : 'pending';
};

export const getStatusConfig = (status: PostDisplayStatus): StatusConfig => {
  switch (status) {
    case 'completed':
      return {
        label: 'Terminé',
        icon: CheckCircle2,
        color: 'bg-green-500',
        textColor: 'text-green-600',
        bgColor: 'bg-green-50',
      };
    case 'in-progress':
      return {
        label: 'En cours',
        icon: Clock,
        color: 'bg-amber-500',
        textColor: 'text-amber-600',
        bgColor: 'bg-amber-50',
      };
    case 'pending':
      return {

        label: 'En vote',
        icon: Vote,
        color: 'bg-blue-500',
        textColor: 'text-blue-600',
        bgColor: 'bg-blue-50',
      };
  }
};