'use client';

import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/lib/auth/auth-context';
import { pathLabels } from '@/lib/constants/navigation';
import { LogOut, Menu } from 'lucide-react';

interface HeaderProps {
  onMenuClick?: () => void;
}

function getPageTitle(pathname: string): string {
  const exact = pathLabels[pathname];
  if (exact) return exact;
  const match = Object.entries(pathLabels).find(
    ([path]) => pathname.startsWith(path + '/')
  );
  return match?.[1] || 'Dashboard';
}

function roleBadgeVariant(role: string) {
  switch (role) {
    case 'MANAGER': return 'default' as const;
    case 'CASHIER': return 'secondary' as const;
    case 'SALES': return 'outline' as const;
    default: return 'outline' as const;
  }
}

export function Header({ onMenuClick }: HeaderProps) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const title = getPageTitle(pathname);

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border/70 bg-background/80 px-4 backdrop-blur-md lg:px-6">
      <div className="flex items-center gap-3">
        <button
          className="rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-foreground lg:hidden"
          onClick={onMenuClick}
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <h1 className="font-display text-lg font-bold tracking-tight text-foreground sm:text-xl">
          {title}
        </h1>
      </div>
      <div className="flex items-center gap-2 sm:gap-3">
        {user && (
          <>
            <span className="hidden text-sm font-medium text-foreground sm:inline">
              {user.fullName}
            </span>
            <Badge variant={roleBadgeVariant(user.role)}>{user.role}</Badge>
          </>
        )}
        <Button variant="outline" size="sm" onClick={logout}>
          <LogOut className="h-4 w-4 sm:mr-2" />
          <span className="hidden sm:inline">Sign out</span>
        </Button>
      </div>
    </header>
  );
}
