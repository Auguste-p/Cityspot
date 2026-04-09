import { CheckCircle2, Clock, Vote, type LucideIcon } from 'lucide-react';
import type { Post } from '../types/Post';

export type PostDisplayStatus = Post['status'];

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

  return getNetVotes(post) >= 10 ? 'in-progress' : 'pending';
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