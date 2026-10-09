export interface Task {
  id: string;
  title: string;
  completed: boolean;
}

export type PostCategory = 'voirie' | 'eclairage' | 'securite' | 'proprete' | 'espaces-verts' | 'mobilier-urbain' | 'peinture';

export interface Post {
  id: string;
  title: string;
  description: string;
  location: {
    lat: number;
    lng: number;
    address: string;
  };
  imageUrl: string;
  tasks: Task[];
  materials: string[];
  isPrivateProperty: boolean;
  isOwnProperty?: boolean;
  propertyDocument?: string;
  ownerEmail?: string;
  votes: {
    positive: number;
    negative: number;
  };
  userVotes?: Record<string, { type: 'positive' | 'negative'; commitment: 'simple' | 'engage' | 'lead' }>;
  createdAt: Date;
  status: 'pending' | 'in-progress' | 'completed';
  isMunicipalProject?: boolean;
  categories: PostCategory[];
  created_by?: string;
  // Nom du créateur (vue issue_authors) : seulement sur le détail d'un signalement.
  authorName?: string;
  city?: string;
  // Code INSEE de la commune : clé de rattachement à la mairie (city n'est que le nom affiché).
  cityInsee?: string;
  revoked?: { at: Date; reason: string };
}