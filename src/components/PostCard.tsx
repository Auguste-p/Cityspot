import { memo } from 'react';
import { Ban, Building2, CheckCircle2, Home, MapPin, Vote } from 'lucide-react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { MUNICIPAL_GRADIENT_CLASS, VOTE_GOAL, getActualStatus, getNetVotes, getStatusConfig } from '../lib/postStatus';
import type { Post } from '../types/Post';
import { POST_CATEGORY_CONFIG } from '../lib/postCategory';
import { getCityName } from "../lib/geocode";

interface PostCardProps {
  post: Post;
  onClick?: () => void;
  className?: string;
}

function PostCardComponent({ post, onClick, className }: PostCardProps) {
  const actualStatus = getActualStatus(post);
  const statusConfig = getStatusConfig(actualStatus);
  const StatusIcon = statusConfig.icon;
  const completedTasks = post.tasks.filter((task) => task.completed).length;
  const netVotes = getNetVotes(post);
  const showProgress = actualStatus === 'in-progress' || actualStatus === 'completed';
  const showVotes = netVotes < VOTE_GOAL && post.status === 'pending';
  const clickableClassName = onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : '';

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
              {post.revoked ? (
                <Badge variant="outline" className="bg-red-50 text-red-700 border-0">
                  <Ban className="size-3 mr-1" />
                  Révoqué
                </Badge>
              ) : (
                <Badge variant="outline" className={`${statusConfig.bgColor} ${statusConfig.textColor} border-0`}>
                  <StatusIcon className="size-3 mr-1" />
                  {statusConfig.label}
                </Badge>
              )}
              {post.isMunicipalProject && (
                <Badge className={`${MUNICIPAL_GRADIENT_CLASS} text-white border-0 text-xs`}>
                  <Building2 className="size-2.5 mr-1" />
                  Mairie
                </Badge>
              )}
            </div>
          </div>

          <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
            {post.description}
          </p>

          {/* Trois lignes : adresse, catégories, puis avancement / votes. `gap-x-*` et `gap-y-*` n'existent pas
              dans le CSS statique du projet : on n'utilise que `gap-1` et `gap-3`. */}
          <div className="flex flex-col gap-1 text-xs text-muted-foreground">
            <div className="flex items-center gap-1" data-testid="card-address">
              <MapPin className="size-3" />
              <span className="truncate">{getCityName(post.location.address)}</span>
            </div>

            {post.categories.length > 0 && (
              <div className="flex flex-wrap items-center gap-3" data-testid="card-categories">
                {post.categories.map((category) => {
                  const { icon: CategoryIcon, label, color } = POST_CATEGORY_CONFIG[category];
                  return (
                    <div key={category} className="flex items-center gap-1">
                      <CategoryIcon className={`size-3 ${color}`} />
                      <span>{label}</span>
                    </div>
                  );
                })}
              </div>
            )}

            {(showProgress || showVotes || post.isPrivateProperty) && (
              <div className="flex flex-wrap items-center gap-3" data-testid="card-progress">
                {showProgress && (
                  <div className="flex items-center gap-1">
                    <CheckCircle2 className="size-3" />
                    <span>
                      {completedTasks}/{post.tasks.length}
                    </span>
                  </div>
                )}

                {showVotes && (
                  <div className="flex items-center gap-1">
                    <Vote className="size-3" />
                    <span>{netVotes}/{VOTE_GOAL} votes</span>
                  </div>
                )}

                {post.isPrivateProperty && (
                  <div className="flex items-center gap-1">
                    <Home className="size-3" />
                    <span>Privé</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}

export const PostCard = memo(PostCardComponent);
