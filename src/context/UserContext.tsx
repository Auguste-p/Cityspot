import { createContext, useContext, type ReactNode } from 'react';

export type UserRole = 'citizen' | 'municipal';

export interface AppUser {
  name: string;
  email: string;
  avatar: string;
  joinDate: Date;
  phone: string;
  address: string;
  role: UserRole;
}

const mockUser: AppUser = {
  name: 'Jean Dupont',
  email: 'jean.dupont@email.com',
  avatar: 'JD',
  joinDate: new Date('2024-06-15'),
  phone: '+33 6 12 34 56 78',
  address: '123 Rue de la République, 75001 Paris',
  role: 'municipal',
};

interface UserContextValue {
  user: AppUser;
  isMunicipalUser: boolean;
}

const UserContext = createContext<UserContextValue | null>(null);

interface UserProviderProps {
  children: ReactNode;
}

export function UserProvider({ children }: UserProviderProps) {
  const value: UserContextValue = {
    user: mockUser,
    isMunicipalUser: mockUser.role === 'municipal',
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser() {
  const context = useContext(UserContext);

  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }

  return context;
}
