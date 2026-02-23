import { useState } from "react";
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

export function MunicipalView() {
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState<
    PostCategory | "all"
  >("all");

  const categories = [
    {
      value: "all" as const,
      label: "Tous",
      icon: Building2,
      color: "text-primary",
    },
    {
      value: "voirie" as const,
      label: "Voirie",
      icon: Car,
      color: "text-slate-600",
    },
    {
      value: "eclairage" as const,
      label: "Éclairage",
      icon: Lightbulb,
      color: "text-yellow-600",
    },
    {
      value: "securite" as const,
      label: "Sécurité",
      icon: Shield,
      color: "text-red-600",
    },
    {
      value: "proprete" as const,
      label: "Propreté",
      icon: TrashIcon,
      color: "text-cyan-600",
    },
    {
      value: "espaces-verts" as const,
      label: "Espaces verts",
      icon: Trees,
      color: "text-green-600",
    },
    {
      value: "mobilier-urbain" as const,
      label: "Mobilier urbain",
      icon: Armchair,
      color: "text-orange-600",
    },
  ];

  const getNetVotes = (post: (typeof mockPosts)[0]) =>
    post.votes.positive - post.votes.negative;

  const getActualStatus = (
    post: (typeof mockPosts)[0],
  ): "pending" | "in-progress" | "completed" => {
    if (post.status === "completed") return "completed";
    const netVotes = getNetVotes(post);
    return netVotes >= 10 ? "in-progress" : "pending";
  };

  const getStatusConfig = (
    status: "pending" | "in-progress" | "completed",
  ) => {
    switch (status) {
      case "completed":
        return {
          label: "Terminé",
          icon: CheckCircle2,
          color: "text-green-600",
          bg: "bg-green-50",
        };
      case "in-progress":
        return {
          label: "En cours",
          icon: Clock,
          color: "text-amber-600",
          bg: "bg-amber-50",
        };
      case "pending":
        return {
          label: "En vote",
          icon: Vote,
          color: "text-blue-600",
          bg: "bg-blue-50",
        };
    }
  };

  const getCategoryConfig = (category?: PostCategory) => {
    if (!category) return null;
    return categories.find((c) => c.value === category);
  };

  const filteredPosts =
    selectedCategory === "all"
      ? mockPosts
      : mockPosts.filter(
          (p) => p.category === selectedCategory,
        );

  const votingPosts = filteredPosts.filter((p) => {
    const netVotes = getNetVotes(p);
    return p.status === "pending" && netVotes < 10;
  });

  const inProgressPosts = filteredPosts.filter((p) => {
    const netVotes = getNetVotes(p);
    return (
      p.status === "in-progress" ||
      (p.status === "pending" && netVotes >= 10)
    );
  });

  const completedPosts = filteredPosts.filter(
    (p) => p.status === "completed",
  );

  const PostCard = ({
    post,
  }: {
    post: (typeof mockPosts)[0];
  }) => {
    const config = getStatusConfig(getActualStatus(post));
    const StatusIcon = config.icon;
    const completedTasks = post.tasks.filter(
      (t) => t.completed,
    ).length;
    const netVotes = getNetVotes(post);
    const categoryConfig = getCategoryConfig(post.category);
    const CategoryIcon = categoryConfig?.icon || Building2;

    return (
      <Card
        className="p-4 cursor-pointer hover:shadow-md transition-shadow"
        onClick={() => navigate(`/post/${post.id}`)}
      >
        <div className="flex gap-4">
          <img
            src={post.imageUrl}
            alt={post.title}
            className="w-24 h-24 object-cover rounded-lg flex-shrink-0"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-2">
              <h3 className="text-sm truncate">{post.title}</h3>
              <div className="flex flex-col gap-1 flex-shrink-0">
                <Badge
                  variant="outline"
                  className={`${config.bg} ${config.color} border-0`}
                >
                  <StatusIcon className="size-3 mr-1" />
                  {config.label}
                </Badge>
                {post.isMunicipalProject && (
                  <Badge className="bg-gradient-to-r from-blue-600 to-blue-500 text-white border-0">
                    <Building2 className="size-3 mr-1" />
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
                <span className="truncate">
                  {post.location.address.split(",")[0]}
                </span>
              </div>
              {categoryConfig && (
                <div className="flex items-center gap-1">
                  <CategoryIcon
                    className={`size-3 ${categoryConfig.color}`}
                  />
                  <span>{categoryConfig.label}</span>
                </div>
              )}
              {(getActualStatus(post) === "in-progress" ||
                getActualStatus(post) === "completed") && (
                <div className="flex items-center gap-1">
                  <CheckCircle2 className="size-3" />
                  <span>
                    {completedTasks}/{post.tasks.length}
                  </span>
                </div>
              )}
              {netVotes < 10 && post.status === "pending" && (
                <div className="flex items-center gap-1">
                  <Vote className="size-3" />
                  <span>{netVotes}/10 votes</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </Card>
    );
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
            {categories.map((category) => {
              const Icon = category.icon;
              const isSelected =
                selectedCategory === category.value;
              const count =
                category.value === "all"
                  ? mockPosts.length
                  : mockPosts.filter(
                      (p) => p.category === category.value,
                    ).length;

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
                <PostCard key={post.id} post={post} />
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
                <PostCard key={post.id} post={post} />
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
                <PostCard key={post.id} post={post} />
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
                <PostCard key={post.id} post={post} />
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