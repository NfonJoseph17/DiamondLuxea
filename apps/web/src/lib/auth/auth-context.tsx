'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getMe } from '@/lib/api/auth';
import { ApiError } from '@/lib/api/client';
import { isNetworkError } from '@/lib/offline/network';
import type { User } from '@/types';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  setAuth: (token: string, user: User) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const hydrate = useCallback(async () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) {
      setIsLoading(false);
      return;
    }
    try {
      const me = await getMe();
      setUser(me);
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      } else if (isNetworkError(e) || (e instanceof TypeError && String(e.message).includes('fetch'))) {
        try {
          const raw = localStorage.getItem('user');
          if (raw) setUser(JSON.parse(raw) as User);
        } catch {
          /* keep null */
        }
      } else {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  const setAuth = useCallback((token: string, userData: User) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    router.push('/login');
  }, [router]);

  return (
    <AuthContext.Provider
      value={{ user, isLoading, isAuthenticated: !!user, setAuth, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
