import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { mockPosts } from "../data/mockPosts";
import { PostCategory } from "../types/Post";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "./ui/tabs";
import {
  MapPin,
  CheckCircle2,
  Clock,
  Vote,
  Building2,
  Car,
  Lightbulb,
  Shield,
  Trash2 as TrashIcon,
  Trees,
  Armchair,
} from "lucide-react";
import { getNetVotes } from "../lib/postStatus";
import { PostCard } from "./PostCard";

type CategoryValue = PostCategory | "all";

const CATEGORIES: Array<{
  value: CategoryValue;
  label: string;
  icon: typeof Building2;
  color: string;
}> = [
  {
    value: "all",
    label: "Tous",
    icon: Building2,
    color: "text-primary",
  },
  {
    value: "voirie",
    label: "Voirie",
    icon: Car,
    color: "text-slate-600",
  },
  {
    value: "eclairage",
    label: "Éclairage",
    icon: Lightbulb,
    color: "text-yellow-600",
  },
  {
    value: "securite",
    label: "Sécurité",
    icon: Shield,
    color: "text-red-600",
  },
  {
    value: "proprete",
    label: "Propreté",
    icon: TrashIcon,
    color: "text-cyan-600",
  },
  {
    value: "espaces-verts",
    label: "Espaces verts",
    icon: Trees,
    color: "text-green-600",
  },
  {
    value: "mobilier-urbain",
    label: "Mobilier urbain",
    icon: Armchair,
    color: "text-orange-600",
  },
];

export function MunicipalView() {
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState<CategoryValue>("all");

  const categoryConfigByValue = useMemo(
    () => new Map(CATEGORIES.map((category) => [category.value, category])),
    [],
  );

  const categoryCounts = useMemo(() => {
    const counts: Record<CategoryValue, number> = {
      all: mockPosts.length,
      voirie: 0,
      eclairage: 0,
      securite: 0,
      proprete: 0,
      "espaces-verts": 0,
      "mobilier-urbain": 0,
    };

    mockPosts.forEach((post) => {
      if (post.category) {
        counts[post.category] += 1;
      }
    });

    return counts;
  }, []);

  const filteredPosts = useMemo(
    () =>
      selectedCategory === "all"
        ? mockPosts
        : mockPosts.filter((post) => post.category === selectedCategory),
    [selectedCategory],
  );

  const votingPosts = useMemo(
    () =>
      filteredPosts.filter((post) => {
        const netVotes = getNetVotes(post);
        return post.status === "pending" && netVotes < 10;
      }),
    [filteredPosts],
  );

  const inProgressPosts = useMemo(
    () =>
      filteredPosts.filter((post) => {
        const netVotes = getNetVotes(post);
        return post.status === "in-progress" || (post.status === "pending" && netVotes >= 10);
      }),
    [filteredPosts],
  );

  const completedPosts = useMemo(
    () => filteredPosts.filter((post) => post.status === "completed"),
    [filteredPosts],
  );

  const getCategoryConfig = (category?: PostCategory) => {
    if (!category) {
      return null;
    }
    return categoryConfigByValue.get(category) ?? null;
  };

  return (
    <div className="min-h-full bg-background pb-6">
      {/* Header */}
      <div className="bg-gradient-to-b from-primary to-primary/90 text-primary-foreground">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-primary-foreground/20 rounded-lg backdrop-blur-sm border-2 border-primary-foreground/30">
              <Building2 className="size-8" />
            </div>
            <div>
              <h1 className="mb-1">Nom ville</h1>
              <p className="text-primary-foreground/80 text-sm">
                Gestion des projets municipaux
              </p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="p-4 bg-primary-foreground/10 backdrop-blur-sm border-primary-foreground/20">
              <div className="text-2xl mb-1">
                {filteredPosts.length}
              </div>
              <div className="text-xs text-primary-foreground/80">
                Total projets
              </div>
            </Card>
            <Card className="p-4 bg-primary-foreground/10 backdrop-blur-sm border-primary-foreground/20">
              <div className="text-2xl mb-1">
                {votingPosts.length}
              </div>
              <div className="text-xs text-primary-foreground/80">
                En vote
              </div>
            </Card>
            <Card className="p-4 bg-primary-foreground/10 backdrop-blur-sm border-primary-foreground/20">
              <div className="text-2xl mb-1">
                {inProgressPosts.length}
              </div>
              <div className="text-xs text-primary-foreground/80">
                En cours
              </div>
            </Card>
            <Card className="p-4 bg-primary-foreground/10 backdrop-blur-sm border-primary-foreground/20">
              <div className="text-2xl mb-1">
                {completedPosts.length}
              </div>
              <div className="text-xs text-primary-foreground/80">
                Terminés
              </div>
            </Card>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 max-w-6xl">
        {/* Category Filters */}
        <div className="mb-6">
          <h2 className="mb-4">Filtrer par catégorie</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
            {CATEGORIES.map((category) => {
              const Icon = category.icon;
              const isSelected =
                selectedCategory === category.value;
              const count = categoryCounts[category.value];

              return (
                <Card
                  key={category.value}
                  onClick={() =>
                    setSelectedCategory(category.value)
                  }
                  className={`p-4 cursor-pointer transition-all hover:shadow-md ${
                    isSelected
                      ? "bg-primary text-primary-foreground ring-2 ring-primary"
                      : "hover:bg-accent/50"
                  }`}
                >
                  <div className="flex flex-col items-center text-center gap-2">
                    <Icon
                      className={`size-6 ${isSelected ? "text-primary-foreground" : category.color}`}
                    />
                    <div>
                      <div className="text-sm">
                        {category.label}
                      </div>
                      <div
                        className={`text-xs mt-1 ${isSelected ? "text-primary-foreground/80" : "text-muted-foreground"}`}
                      >
                        {count} projet{count > 1 ? "s" : ""}
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Tabs for different post statuses */}
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="all">
              Tous ({filteredPosts.length})
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
            {filteredPosts.length > 0 ? (
              filteredPosts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  onClick={() => navigate(`/post/${post.id}`)}
                  categoryBadge={post.category ? getCategoryConfig(post.category) ?? null : null}
                />
              ))
            ) : (
              <Card className="p-8 text-center">
                <MapPin className="size-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">
                  Aucun signalement dans cette catégorie
                </p>
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
                  categoryBadge={post.category ? getCategoryConfig(post.category) ?? null : null}
                />
              ))
            ) : (
              <Card className="p-8 text-center">
                <Vote className="size-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">
                  Aucun signalement en cours de vote
                </p>
              </Card>
            )}
          </TabsContent>

          <TabsContent
            value="in-progress"
            className="space-y-4"
          >
            {inProgressPosts.length > 0 ? (
              inProgressPosts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  onClick={() => navigate(`/post/${post.id}`)}
                  categoryBadge={post.category ? getCategoryConfig(post.category) ?? null : null}
                />
              ))
            ) : (
              <Card className="p-8 text-center">
                <Clock className="size-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">
                  Aucun signalement en cours
                </p>
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
                  categoryBadge={post.category ? getCategoryConfig(post.category) ?? null : null}
                />
              ))
            ) : (
              <Card className="p-8 text-center">
                <CheckCircle2 className="size-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">
                  Aucun signalement terminé
                </p>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}