import { getSupabaseClient } from './supabase';

export const MAX_UPLOAD_SIZE = 5 * 1024 * 1024;

export function isAllowedImageFile(file: File) {
  return file.type.startsWith('image/') && file.size <= MAX_UPLOAD_SIZE;
}

// Chemin {userId}/... : les policies RLS sur storage.objects (bucket "issue-photos"/
// "avatars") vérifient que le premier segment du chemin est l'auth.uid() de l'appelant.
export async function uploadToBucket(bucket: string, userId: string, file: File): Promise<string> {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase non configuré');

  const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const path = `${userId}/${Date.now()}.${extension}`;

  const { error } = await client.storage.from(bucket).upload(path, file, {
    contentType: file.type,
    upsert: true,
  });

  if (error) throw new Error(error.message);

  return client.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}

const DEFAULT_ISSUE_PHOTO_PATH = 'default/no-photo.svg';
const FALLBACK_DEMO_IMAGE_URL = 'https://picsum.photos/200';

// Image utilisée quand un signalement n'a pas de photo. Résolue via le SDK
// (pas d'URL en dur) car l'URL du projet Supabase change selon l'environnement.
export function getDefaultIssuePhotoUrl(): string {
  const client = getSupabaseClient();
  if (!client) return FALLBACK_DEMO_IMAGE_URL;

  return client.storage.from('issue-photos').getPublicUrl(DEFAULT_ISSUE_PHOTO_PATH).data.publicUrl;
}
