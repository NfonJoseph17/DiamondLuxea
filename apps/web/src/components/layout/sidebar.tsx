'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth/auth-context';
import { navItemsForRole, defaultHomePath } from '@/lib/constants/navigation';
import { useBarName } from '@/lib/hooks/use-bar-settings';
import { X } from 'lucide-react';

interface SidebarProps {
  open?: boolean;
  onClose?: () => void;
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { user } = useAuth();
  const { barName } = useBarName();

  const visibleItems = user ? navItemsForRole(user.role) : [];

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={onClose} />
      )}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-60 flex-col border-r bg-card transition-transform lg:static lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex h-14 items-center justify-between border-b px-5">
          <Link
            href={user ? defaultHomePath(user.role) : '/dashboard'}
            className="text-lg font-bold tracking-tight truncate"
            title={barName}
          >
            {barName}
          </Link>
          <button className="lg:hidden" onClick={onClose}>
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="flex-1 space-y-1 overflow-auto p-3">
          {visibleItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                )}
              >
                <Icon className="h-5 w-5 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t p-3">
          <div className="rounded-lg bg-muted/50 px-3 py-2">
            <p className="truncate text-sm font-medium">{user?.fullName}</p>
            <p className="text-xs text-muted-foreground">{user?.role}</p>
          </div>
        </div>
      </aside>
    </>
  );
}
