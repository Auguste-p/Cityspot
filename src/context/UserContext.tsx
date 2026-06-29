import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { getSupabaseClient } from '../lib/supabase';

export type UserRole = 'citizen' | 'municipal';

export interface AppUser {
  id: string;
  email: string;
  name?: string;
  avatar?: string;
  role: UserRole;
}

interface UserContextValue {
  user: AppUser | null;
  loading: boolean;
  isMunicipalUser: boolean;
  refreshUser: () => Promise<void>;
}

const UserContext = createContext<UserContextValue | null>(null);

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  // 🔄 Charger user au démarrage
  const loadUser = async () => {
    setLoading(true);

    const { data } = await getSupabaseClient()!.auth.getUser();

    const authUser = data.user;

    if (!authUser) {
      setUser(null);
      setLoading(false);
      return;
    }

    // 👉 mapping Supabase → ton AppUser
    const appUser: AppUser = {
      id: authUser.id,
      email: authUser.email!,
      name: authUser.user_metadata?.name || authUser.email!,
      avatar: authUser.user_metadata?.avatar || '',
      role: authUser.user_metadata?.role || 'citizen',
    };

    setUser(appUser);
    setLoading(false);
  };

  useEffect(() => {
    loadUser();

    // 👂 écoute login/logout en live
    const { data: listener } = getSupabaseClient()!.auth.onAuthStateChange(
      async () => {
        await loadUser();
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