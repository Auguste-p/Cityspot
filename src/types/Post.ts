export interface Task {
  id: string;
  title: string;
  completed: boolean;
}

export type PostCategory = 'voirie' | 'eclairage' | 'securite' | 'proprete' | 'espaces-verts' | 'mobilier-urbain';

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
  category?: PostCategory;
  created_by?: string;
}