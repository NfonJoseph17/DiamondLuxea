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
    <header className="flex h-14 items-center justify-between border-b bg-background px-4 lg:px-6">
      <div className="flex items-center gap-3">
        <button className="lg:hidden" onClick={onMenuClick}>
          <Menu className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-semibold">{title}</h1>
      </div>
      <div className="flex items-center gap-3">
        {user && (
          <>
            <span className="hidden text-sm text-muted-foreground sm:inline">{user.fullName}</span>
            <Badge variant={roleBadgeVariant(user.role)}>{user.role}</Badge>
          </>
        )}
        <Button variant="ghost" size="sm" onClick={logout}>
          <LogOut className="mr-2 h-4 w-4" />
          <span className="hidden sm:inline">Sign out</span>
        </Button>
      </div>
    </header>
  );
}
