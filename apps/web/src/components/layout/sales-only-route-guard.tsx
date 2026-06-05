'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/auth-context';

/**
 * SALES may only use /sales (and subpaths). Blocks direct URL access to other dashboard routes.
 */
export function SalesOnlyRouteGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (isLoading || !user) return;
    if (user.role === 'SALES' && !pathname.startsWith('/sales')) {
      router.replace('/sales');
    }
  }, [isLoading, user, pathname, router]);

  if (!isLoading && user?.role === 'SALES' && !pathname.startsWith('/sales')) {
    return (
      <div className="flex h-full min-h-[40vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return <>{children}</>;
}
