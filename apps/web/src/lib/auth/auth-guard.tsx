'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './auth-context';
import type { Role } from '@/types';
import { defaultHomePath } from '@/lib/constants/navigation';

interface AuthGuardProps {
  children: React.ReactNode;
  allowedRoles?: Role[];
}

export function AuthGuard({ children, allowedRoles }: AuthGuardProps) {
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      router.replace('/login');
      return;
    }
    if (allowedRoles && user && !allowedRoles.includes(user.role)) {
      router.replace(defaultHomePath(user.role));
    }
  }, [isLoading, isAuthenticated, user, allowedRoles, router]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold">Access Denied</h2>
          <p className="mt-2 text-muted-foreground">You do not have permission to view this page.</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
