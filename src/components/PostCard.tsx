import { memo } from 'react';
import { Building2, CheckCircle2, Home, MapPin, Vote } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { getActualStatus, getNetVotes, getStatusConfig } from '../lib/postStatus';
import type { Post } from '../types/Post';

type CategoryBadge = {
  label: string;
  icon: LucideIcon;
  color: string;
};

interface PostCardProps {
  post: Post;
  onClick?: () => void;
  categoryBadge?: CategoryBadge | null;
  className?: string;
}

function PostCardComponent({ post, onClick, categoryBadge, className }: PostCardProps) {
  const actualStatus = getActualStatus(post);
  const statusConfig = getStatusConfig(actualStatus);
  const StatusIcon = statusConfig.icon;
  const completedTasks = post.tasks.filter((task) => task.completed).length;
  const netVotes = getNetVotes(post);
  const clickableClassName = onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : '';
  const CategoryIcon = categoryBadge?.icon;

  return (
    <Card className={`p-4 ${clickableClassName} ${className ?? ''}`.trim()} onClick={onClick}>
      <div className="flex gap-4">
        <img
          src={post.imageUrl}
          alt={post.title}
          className="w-24 h-24 object-cover rounded-lg flex-shrink-0"
          loading="lazy"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-2">
            <h3 className="text-sm truncate">{post.title}</h3>
            <div className="flex flex-col gap-1 flex-shrink-0">
              <Badge variant="outline" className={`${statusConfig.bgColor} ${statusConfig.textColor} border-0`}>
                <StatusIcon className="size-3 mr-1" />
                {statusConfig.label}
              </Badge>
              {post.isMunicipalProject && (
                <Badge className="bg-gradient-to-r from-blue-600 to-blue-500 text-white border-0 text-xs">
                  <Building2 className="size-2.5 mr-1" />
                  Mairie
                </Badge>
              )}
            </div>
          </div>

          <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
            {post.description}
          </p>

          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <MapPin className="size-3" />
              <span className="truncate">{post.location.address.split(',')[0]}</span>
            </div>

            {categoryBadge && (
              <div className="flex items-center gap-1">
                {CategoryIcon && <CategoryIcon className={`size-3 ${categoryBadge.color}`} />}
                <span>{categoryBadge.label}</span>
              </div>
            )}

            {(actualStatus === 'in-progress' || actualStatus === 'completed') && (
              <div className="flex items-center gap-1">
                <CheckCircle2 className="size-3" />
                <span>
                  {completedTasks}/{post.tasks.length}
                </span>
              </div>
            )}

            {netVotes < 10 && post.status === 'pending' && (
              <div className="flex items-center gap-1">
                <Vote className="size-3" />
                <span>{netVotes}/10 votes</span>
              </div>
            )}

            {post.isPrivateProperty && (
              <div className="flex items-center gap-1">
                <Home className="size-3" />
                <span>Privé</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}

export const PostCard = memo(PostCardComponent);
