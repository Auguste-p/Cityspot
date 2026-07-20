import {getSupabaseClient} from '../lib/supabase';

// 🔑 Sign up
export interface SignUpProfile {
  name: string;
  city: string;
  cityLat?: number;
  cityLng?: number;
}

export async function signUp(email: string, password: string, profile: SignUpProfile) {
  // Garde-fou : auth.users est la source canonique de l'email (public.users
  // n'en garde pas de copie) — une ligne public.users supprimée à la main
  // sans supprimer la ligne auth.users correspondante laisserait sinon
  // `auth.signUp()` échouer ou se comporter de façon confuse sans message clair.
  const { data: emailTaken, error: checkError } = await getSupabaseClient()!.rpc('email_exists', {
    check_email: email,
  });
  if (checkError) throw checkError;
  if (emailTaken) {
    throw new Error('Un compte existe déjà avec cet email.');
  }

  // name/city/cityLat/cityLng passent tous par user_metadata : le trigger
  // handle_new_user() les insère en une fois dans public.users, côté serveur,
  // indépendamment de toute session client (importante depuis que ce projet
  // exige la confirmation par email — pas de session juste après signUp()).
  const { data, error } = await getSupabaseClient()!.auth.signUp({
    email,
    password,
    options: {
      data: profile,
      // Sans ça, Supabase retombe sur le "Site URL" configuré côté dashboard
      // (souvent resté sur localhost depuis le setup initial) pour le lien de
      // confirmation, quel que soit le domaine réel d'où l'inscription a eu
      // lieu. Doit aussi être ajouté à la liste "Redirect URLs" du dashboard,
      // sinon Supabase l'ignore silencieusement et retombe sur le Site URL.
      emailRedirectTo: `${window.location.origin}/login`,
    },
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