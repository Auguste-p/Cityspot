import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Post } from '../types/Post';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { MapPin, Calendar, CheckCircle2, Clock, AlertCircle, ThumbsUp, ThumbsDown, Home, Vote, Building2, Loader2, ChevronLeft, LocateFixed } from 'lucide-react';
import { VoteDialog } from './VoteDialog';
import { toast } from 'sonner';
import { MUNICIPAL_GRADIENT_CLASS, STATUS_MARKER_COLORS, VOTE_GOAL, getActualStatus, getNetVotes, getStatusConfig } from '../lib/postStatus';
import { useIssues } from '../hooks/useIssues';
import { FALLBACK_CITY, MAP_STYLE, NOMINATIM_REVERSE_GEOCODE_URL } from '../constants/map';
import { deleteIssue } from '../services/issuesService';

async function reverseGeocodeCity(lat: number, lng: number) {
  const endpoint = new URL(NOMINATIM_REVERSE_GEOCODE_URL);
  endpoint.searchParams.set('format', 'jsonv2');
  endpoint.searchParams.set('lat', String(lat));
  endpoint.searchParams.set('lon', String(lng));
  endpoint.searchParams.set('accept-language', 'fr');

  try {
    const response = await fetch(endpoint.toString());
    if (!response.ok) {
      return null;
    }

    const payload = await response.json() as {
      address?: {
        city?: string;
        town?: string;
        village?: string;
        municipality?: string;
      };
    };

    return payload.address?.city
      ?? payload.address?.town
      ?? payload.address?.village
      ?? payload.address?.municipality
      ?? null;
  } catch {
    return null;
  }
}

export function MapView() {
  const navigate = useNavigate();
  const { issues: posts, loading, error } = useIssues();
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [voteDialogOpen, setVoteDialogOpen] = useState(false);
  const [votingPost, setVotingPost] = useState<Post | null>(null);
  const [activeCity, setActiveCity] = useState<string>(FALLBACK_CITY.name);
  const [isLocating, setIsLocating] = useState(false);

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

  const handleLocateUser = () => {
    const map = mapRef.current;
    if (!map) {
      return;
    }

    if (!navigator.geolocation) {
      setActiveCity(FALLBACK_CITY.name);
      map.flyTo({
        center: [FALLBACK_CITY.lng, FALLBACK_CITY.lat],
        zoom: FALLBACK_CITY.zoom,
        duration: 900,
      });
      toast.info('La géolocalisation est indisponible sur cet appareil.');
      return;
    }

    setIsLocating(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        map.flyTo({ center: [longitude, latitude], zoom: 13.5, duration: 900 });

        const cityName = await reverseGeocodeCity(latitude, longitude);
        setActiveCity(cityName ?? 'Position actuelle');

        toast.success(cityName
          ? `Carte centrée sur ${cityName}.`
          : 'Carte centrée sur votre position.');
        setIsLocating(false);
      },
      () => {
        setActiveCity(FALLBACK_CITY.name);
        map.flyTo({
          center: [FALLBACK_CITY.lng, FALLBACK_CITY.lat],
          zoom: FALLBACK_CITY.zoom,
          duration: 900,
        });
        toast.info(`Géolocalisation refusée: recentrage sur ${FALLBACK_CITY.name}.`);
        setIsLocating(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 8000,
        maximumAge: 300000,
      },
    );
  };

  useEffect(() => {
    if (loading || error) {
      return;
    }

    if (!mapContainerRef.current || mapRef.current) {
      return;
    }

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: MAP_STYLE,
      center: [FALLBACK_CITY.lng, FALLBACK_CITY.lat],
      zoom: FALLBACK_CITY.zoom,
      attributionControl: { compact: true },
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-right');
    mapRef.current = map;

    return () => {
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];
      map.remove();
      mapRef.current = null;
    };
  }, [loading, error]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) {
      return;
    }

    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    posts.forEach((post) => {
      if (!Number.isFinite(post.location.lat) || !Number.isFinite(post.location.lng)) {
        return;
      }

      const markerElement = document.createElement('button');
      markerElement.type = 'button';
      markerElement.className = 'cityspot-marker';
      if (selectedPost?.id === post.id) {
        markerElement.classList.add('is-selected');
      }
      markerElement.style.setProperty('--marker-color', STATUS_MARKER_COLORS[getActualStatus(post)]);
      markerElement.setAttribute('title', post.title);
      markerElement.setAttribute('aria-label', `Ouvrir le signalement ${post.title}`);

      const dot = document.createElement('span');
      dot.className = 'cityspot-marker-dot';
      markerElement.appendChild(dot);

      if (post.isPrivateProperty) {
        const privateBadge = document.createElement('span');
        privateBadge.className = 'cityspot-marker-private';
        privateBadge.textContent = 'P';
        markerElement.appendChild(privateBadge);
      }

      markerElement.addEventListener('click', () => {
        setSelectedPost(post);
      });

      const marker = new maplibregl.Marker({ element: markerElement, anchor: 'bottom' })
        .setLngLat([post.location.lng, post.location.lat])
        .addTo(map);

      markersRef.current.push(marker);
    });
  }, [posts, selectedPost?.id]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedPost) {
      return;
    }

    if (!Number.isFinite(selectedPost.location.lat) || !Number.isFinite(selectedPost.location.lng)) {
      return;
    }

    map.flyTo({
      center: [selectedPost.location.lng, selectedPost.location.lat],
      zoom: Math.max(map.getZoom(), 14),
      duration: 700,
    });
  }, [selectedPost]);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center p-6">
        <Card className="p-8 text-center max-w-sm w-full">
          <Loader2 className="size-10 mx-auto mb-4 animate-spin text-primary" />
          <h2 className="mb-2">Chargement des signalements</h2>
          <p className="text-sm text-muted-foreground">
            Récupération des données depuis Supabase.
          </p>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center p-6">
        <Card className="p-8 text-center max-w-sm w-full">
          <AlertCircle className="size-10 mx-auto mb-4 text-destructive" />
          <h2 className="mb-2">Impossible de charger la carte</h2>
          <p className="text-sm text-muted-foreground">{error.message}</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col lg:flex-row">
      {/* Map Area */}
      <div className="relative flex-1 bg-muted">
        <div className="relative h-full min-h-[400px] lg:min-h-screen overflow-hidden rounded-none lg:rounded-r-lg" role="region" aria-label="Carte des signalements">
          <div ref={mapContainerRef} className="cityspot-map h-full w-full" />

          <div className="absolute top-4 left-4 z-10 space-y-2">
            <div className="bg-card/95 backdrop-blur-sm px-3 py-2 rounded-lg border border-border shadow-md text-sm">
              <span className="text-muted-foreground">Ville: </span>
              <span>{activeCity}</span>
            </div>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="shadow-md"
              onClick={handleLocateUser}
              disabled={isLocating}
            >
              <LocateFixed className="size-4 mr-2" />
              {isLocating ? 'Localisation...' : 'Me localiser'}
            </Button>
          </div>

          {/* Legend */}
          <div className="absolute top-4 right-4 z-10 bg-card/95 backdrop-blur-sm p-4 rounded-lg shadow-lg border border-border">
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
            <button
              type="button"
              onClick={() => setSelectedPost(null)}
              className="mb-4 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Retour à la liste des signalements"
            >
              <ChevronLeft className="size-4" />
              <span>Retour</span>
            </button>
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
                        <Badge className={`${MUNICIPAL_GRADIENT_CLASS} text-white border-0`}>
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
                        <span>Objectif: +{VOTE_GOAL}</span>
                        <span>{getNetVotes(selectedPost)} / {VOTE_GOAL}</span>
                      </div>
                      <div className="h-1.5 bg-background rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary transition-all"
                          style={{
                            width: `${Math.min((getNetVotes(selectedPost) / VOTE_GOAL) * 100, 100)}%`
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

                <Button
                  onClick={() => {
                    deleteIssue(selectedPost.id);
                    // window.location.reload();
                  }}
                  className="w-full bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Supprimer le signalement
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
              {posts.map((post) => {
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
                              <div className={`flex items-center justify-center p-0.5 ${MUNICIPAL_GRADIENT_CLASS} rounded`} title="Projet Mairie">
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