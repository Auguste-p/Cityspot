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

  const toAppUser = (u: User): AppUser => ({
    id: u.id,
    email: u.email!,
    name: u.user_metadata?.name || u.email!,
    avatar: u.user_metadata?.avatar || '',
    role: u.user_metadata?.role || 'citizen',
  });

  const loadUser = async () => {
    setLoading(true);
    try {
      const { data } = await getSupabaseClient()!.auth.getUser();
      setUser(data.user ? toAppUser(data.user) : null);
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
        setUser(session?.user ? toAppUser(session.user) : null);
        setLoading(false);
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