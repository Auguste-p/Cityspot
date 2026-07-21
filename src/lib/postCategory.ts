import { Car, Lightbulb, Shield, Trash2, Trees, Armchair, type LucideIcon } from 'lucide-react';
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
  proprete: { label: 'Propreté', icon: Trash2, color: 'text-cyan-600' },
  'espaces-verts': { label: 'Espaces verts', icon: Trees, color: 'text-green-600' },
  'mobilier-urbain': { label: 'Mobilier urbain', icon: Armchair, color: 'text-orange-600' },
};

export const POST_CATEGORIES = Object.keys(POST_CATEGORY_CONFIG) as PostCategory[];
