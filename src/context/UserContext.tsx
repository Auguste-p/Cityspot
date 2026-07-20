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
}

interface UserContextValue {
  user: AppUser | null;
  loading: boolean;
  isMunicipalUser: boolean;
  refreshUser: () => Promise<void>;
}

const UserContext = createContext<UserContextValue | null>(null);

// Source of truth for the municipal role: public.users.role, not
// auth.users.user_metadata — the app has no write access to auth.users.
// Coordonnées de la ville : renseignées à l'inscription (LoginPage), utilisées
// pour centrer la carte à la connexion (MapView) sans devoir géolocaliser.
async function fetchProfile(
  userId: string,
): Promise<{ role: UserRole; city?: string; cityLat?: number; cityLng?: number }> {
  const client = getSupabaseClient();
  if (!client) return { role: 'citizen' };

  const { data } = await client.from('users').select('role, city, cityLat, cityLng').eq('id', userId).maybeSingle();
  return {
    role: data?.role === 'municipal' ? 'municipal' : 'citizen',
    city: data?.city ?? undefined,
    cityLat: data?.cityLat ?? undefined,
    cityLng: data?.cityLng ?? undefined,
  };
}

async function toAppUser(u: User): Promise<AppUser> {
  const profile = await fetchProfile(u.id);
  return {
    id: u.id,
    email: u.email!,
    name: u.user_metadata?.name || u.email!,
    avatar: u.user_metadata?.avatar || '',
    role: profile.role,
    city: profile.city,
    cityLat: profile.cityLat,
    cityLng: profile.cityLng,
  };
}

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  const loadUser = async () => {
    setLoading(true);
    try {
      const { data } = await getSupabaseClient()!.auth.getUser();
      setUser(data.user ? await toAppUser(data.user) : null);
    } catch {
      setUser(null);
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
          setLoading(false);
          return;
        }

        void toAppUser(session.user).then((appUser) => {
          setUser(appUser);
          setLoading(false);
        });
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
