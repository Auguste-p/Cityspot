import { z } from 'zod';

// CreatePost form schema
export const createPostSchema = z.object({
  title: z.string()
    .trim()
    .min(1, 'Le titre est requis')
    .min(3, 'Le titre doit contenir au moins 3 caractères')
    .max(150, 'Le titre doit contenir moins de 150 caractères'),
  
  description: z.string()
    .trim()
    .min(1, 'La description est requise')
    .min(10, 'La description doit contenir au moins 10 caractères')
    .max(500, 'La description doit contenir moins de 500 caractères'),
  
  address: z.string()
    .trim()
    .min(1, 'L\'adresse est requise')
    .min(5, 'L\'adresse doit contenir au moins 5 caractères')
    .max(200, 'L\'adresse doit contenir moins de 200 caractères'),
  
  isPrivateProperty: z.enum(['public', 'private']),

  isOwnProperty: z.enum(['yes', 'no']),

  category: z.enum(['voirie', 'eclairage', 'securite', 'proprete', 'espaces-verts', 'mobilier-urbain']).optional(),
  
  propertyDocument: z.string().default(''),
  
  ownerEmail: z.string()
    .trim()
    .default('')
    .refine(
      (email) => !email || /\S+@\S+\.\S+/.test(email),
      'Veuillez entrer un email valide'
    ),
  
  tasks: z.array(
    z.object({
      id: z.string(),
      title: z.string().trim().min(1, 'Le titre de la tâche est requis'),
    })
  ).default([]),
  
  materials: z.array(
    z.object({
      id: z.string(),
      title: z.string().trim().min(1, 'Le matériel ne doit pas être vide'),
    })
  ).default([]),
}).refine(
  (data) => {
    // If private property and not own property, email is required
    if (data.isPrivateProperty === 'private' && data.isOwnProperty === 'no') {
      return data.ownerEmail.trim().length > 0;
    }
    return true;
  },
  {
    message: 'L\'email du propriétaire est requis pour une propriété privée',
    path: ['ownerEmail'],
  }
);

export type CreatePostFormData = z.infer<typeof createPostSchema>;

// Settings form schema
export const settingsFormSchema = z.object({
  name: z.string()
    .trim()
    .min(1, 'Le nom est requis')
    .min(2, 'Le nom doit contenir au moins 2 caractères')
    .max(100, 'Le nom doit contenir moins de 100 caractères'),
  
  email: z.string()
    .trim()
    .email('Veuillez entrer un email valide')
    .min(1, 'L\'email est requis'),
  
  phone: z.string()
    .trim()
    .refine(
      (phone) => {
        if (!phone) return true;
        return /^[\d\s\-+()]{10,}$/.test(phone.replace(/\s/g, ''));
      },
      'Veuillez entrer un numéro de téléphone valide'
    )
    .default(''),
  
  address: z.string().trim().default(''),
  
  avatar: z.string().default(''),

  emailNotifications: z.boolean().optional().default(true),

  profileVisible: z.boolean().optional().default(false),
}).strict();

export type SettingsFormData = z.infer<typeof settingsFormSchema>;
