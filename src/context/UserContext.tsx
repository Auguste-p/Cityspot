import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import type { User } from '@supabase/supabase-js';
import { getSupabaseClient } from '../lib/supabase';

export type UserRole = 'citizen' | 'municipal';

export interface AppUser {
  id: string;
  email: string;
  name?: string;
  avatar?: string;
  role: UserRole;
  city?: string;
  cityLat?: number;
  cityLng?: number;
  // Code INSEE de la commune : rattache un compte mairie à ses signalements.
  cityInsee?: string;
}

export interface PendingDeletion {
  deletedAt: Date;
}

interface UserContextValue {
  user: AppUser | null;
  loading: boolean;
  isMunicipalUser: boolean;
  refreshUser: () => Promise<void>;
  pendingDeletion?: PendingDeletion | null;
}

const UserContext = createContext<UserContextValue | null>(null);

const DELETION_RETENTION_DAYS = 30;

interface Profile {
  role: UserRole;
  name?: string;
  avatar?: string;
  city?: string;
  cityLat?: number;
  cityLng?: number;
  cityInsee?: string;
  deletedAt?: Date;
}

// Source of truth for the municipal role: public.users.role, not
// auth.users.user_metadata — the app has no write access to auth.users.
// Coordonnées de la ville : renseignées à l'inscription (LoginPage), utilisées
// pour centrer la carte à la connexion (MapView) sans devoir géolocaliser.
async function fetchProfile(userId: string): Promise<Profile> {
  const client = getSupabaseClient();
  if (!client) return { role: 'citizen' };

  const { data } = await client
    .from('users')
    .select('role, name, avatar, city, cityLat, cityLng, city_insee, deleted_at')
    .eq('id', userId)
    .maybeSingle();

  return {
    role: data?.role === 'municipal' ? 'municipal' : 'citizen',
    name: data?.name ?? undefined,
    avatar: data?.avatar ?? undefined,
    city: data?.city ?? undefined,
    cityLat: data?.cityLat ?? undefined,
    cityLng: data?.cityLng ?? undefined,
    cityInsee: data?.city_insee ?? undefined,
    deletedAt: data?.deleted_at ? new Date(data.deleted_at) : undefined,
  };
}

function toAppUser(u: User, profile: Profile): AppUser {
  return {
    id: u.id,
    email: u.email!,
    // public.users.name/avatar sont éditables depuis Settings (updateUserProfile) ;
    // le user_metadata Auth, lui, n'est écrit qu'à l'inscription et jamais
    // resynchronisé — s'y fier en priorité affichait l'email/rien pour tout
    // compte modifié ou plus ancien.
    name: profile.name || u.user_metadata?.name || u.email!,
    avatar: profile.avatar || u.user_metadata?.avatar || '',
    role: profile.role,
    city: profile.city,
    cityLat: profile.cityLat,
    cityLng: profile.cityLng,
    cityInsee: profile.cityInsee,
  };
}

interface ResolvedSession {
  user: AppUser | null;
  pendingDeletion: PendingDeletion | null;
  expiredDeletion: boolean;
}

// Résout la session Supabase en trois branches : pas de compte (déconnecté),
// compte marqué supprimé depuis moins de 30 jours (accès bloqué, restauration
// proposée), ou compte actif normal. Le cas "supprimé depuis 30 jours ou
// plus" ne devrait pas arriver en pratique (purge_deleted_accounts tourne
// chaque nuit) mais reste géré : déconnexion silencieuse plutôt que de
// bloquer indéfiniment sur l'écran de restauration.
async function resolveSession(u: User): Promise<ResolvedSession> {
  const profile = await fetchProfile(u.id);

  if (profile.deletedAt) {
    const ageMs = Date.now() - profile.deletedAt.getTime();
    const expired = ageMs >= DELETION_RETENTION_DAYS * 24 * 60 * 60 * 1000;
    return {
      user: null,
      pendingDeletion: expired ? null : { deletedAt: profile.deletedAt },
      expiredDeletion: expired,
    };
  }

  return { user: toAppUser(u, profile), pendingDeletion: null, expiredDeletion: false };
}

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [pendingDeletion, setPendingDeletion] = useState<PendingDeletion | null>(null);
  const [loading, setLoading] = useState(true);

  const applySession = async (sessionUser: User | null) => {
    if (!sessionUser) {
      setUser(null);
      setPendingDeletion(null);
      return;
    }

    const resolved = await resolveSession(sessionUser);
    if (resolved.expiredDeletion) {
      await getSupabaseClient()!.auth.signOut();
    }
    setUser(resolved.user);
    setPendingDeletion(resolved.pendingDeletion);
  };

  const loadUser = async () => {
    setLoading(true);
    try {
      const { data } = await getSupabaseClient()!.auth.getUser();
      await applySession(data.user);
    } catch {
      setUser(null);
      setPendingDeletion(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadUser();

    const { data: listener } = getSupabaseClient()!.auth.onAuthStateChange(
      (_event, session) => {
        if (!session?.user) {
          setUser(null);
          setPendingDeletion(null);
          setLoading(false);
          return;
        }

        void applySession(session.user).then(() => setLoading(false));
      }
    );

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  const value: UserContextValue = {
    user,
    loading,
    isMunicipalUser: user?.role === 'municipal',
    refreshUser: loadUser,
    pendingDeletion,
  };

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);

  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }

  return context;
}
