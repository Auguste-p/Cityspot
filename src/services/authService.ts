import {getSupabaseClient} from '../lib/supabase';

// 🔑 Sign up
export async function signUp(email: string, password: string, profile: { name: string; city: string }) {
  const { data, error } = await getSupabaseClient()!.auth.signUp({
    email,
    password,
    options: { data: profile },
  });

  if (error) throw error;
  return data;
}

// 🔐 Login
export async function signIn(email: string, password: string) {
  const { data, error } = await getSupabaseClient()!.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;
  return data;
}

// 🚪 Logout
export async function signOut() {
  const { error } = await getSupabaseClient()!.auth.signOut();
  if (error) throw error;
}

// 👤 User courant
export async function getCurrentUser() {
  const { data, error } = await getSupabaseClient()!.auth.getUser();
  // Pas de session (visiteur anonyme) : état normal, pas une erreur.
  if (error?.name === 'AuthSessionMissingError') return null;
  if (error) throw error;
  return data.user;
}

// 🪪 Profil (table public.users)
export async function getUserProfile(userId: string) {
  const { data, error } = await getSupabaseClient()!
    .from('users')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export interface UpdateUserProfileInput {
  name: string;
  phone?: string;
  address?: string;
  avatar?: string;
  emailNotifications?: boolean;
  profileVisible?: boolean;
}

export async function updateUserProfile(userId: string, profile: UpdateUserProfileInput) {
  const { error } = await getSupabaseClient()!
    .from('users')
    .update(profile)
    .eq('id', userId);

  if (error) throw error;
}