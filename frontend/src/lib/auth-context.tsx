'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api } from '@/lib/api';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  companyId: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (companyName: string, userName: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    void bootstrapSession();
  }, []);

  const bootstrapSession = async () => {
    try {
      const sessionUser = await api.get<User>('/auth/me', { skipAuth: true });
      setUser(sessionUser);
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    const result = await api.post<{ user: User }>(
      '/auth/login',
      { email, password },
      { skipAuth: true },
    );

    setUser(result.user);
  };

  const register = async (companyName: string, userName: string, email: string, password: string) => {
    const result = await api.post<{ user: User }>(
      '/auth/register',
      { companyName, userName, email, password },
      { skipAuth: true },
    );

    setUser(result.user);
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout', undefined, { skipAuth: true });
    } catch {
      // Ignore network errors while clearing local auth state.
    }
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
