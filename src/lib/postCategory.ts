import { Car, Lightbulb, Shield, Trash2, Trees, Armchair, type LucideIcon, SprayCan } from 'lucide-react';
import type { PostCategory } from '../types/Post';

export interface PostCategoryConfig {
  label: string;
  icon: LucideIcon;
  color: string;
}

export const POST_CATEGORY_CONFIG: Record<PostCategory, PostCategoryConfig> = {
  voirie: { label: 'Voirie', icon: Car, color: 'text-slate-600' },
  eclairage: { label: 'Éclairage', icon: Lightbulb, color: 'text-yellow-600' },
  securite: { label: 'Sécurité', icon: Shield, color: 'text-red-600' },
  'mobilier-urbain': { label: 'Mobilier urbain', icon: Armchair, color: 'text-orange-600' },
  proprete: { label: 'Propreté', icon: Trash2, color: 'text-cyan-600' },
  'espaces-verts': { label: 'Espaces verts', icon: Trees, color: 'text-green-600' },
  peinture: { label: 'Peinture', icon: SprayCan, color: 'text-purple-600' }
};

// Catégories dont les travaux exigent autorisation et matériel spécifique : la mairie est
// prévenue par mail à la création (Edge Function notify-mairie, qui duplique cette liste
// côté Deno — à garder synchronisée).
export const AUTHORIZATION_CATEGORIES: PostCategory[] = ['voirie', 'eclairage', 'securite', 'mobilier-urbain', 'peinture'];

export const requiresAuthorization = (categories: PostCategory[]) =>
  categories.some((category) => AUTHORIZATION_CATEGORIES.includes(category));

export const POST_CATEGORIES = Object.keys(POST_CATEGORY_CONFIG) as PostCategory[];
