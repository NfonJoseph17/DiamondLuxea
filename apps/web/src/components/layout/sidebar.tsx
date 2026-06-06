'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth/auth-context';
import { navItemsForRole, defaultHomePath } from '@/lib/constants/navigation';
import { useBarName } from '@/lib/hooks/use-bar-settings';
import { InstallAppButton } from '@/components/app/install-app-button';
import { X } from 'lucide-react';

interface SidebarProps {
  open?: boolean;
  onClose?: () => void;
}

function initials(name?: string) {
  if (!name) return 'DL';
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { user } = useAuth();
  const { barName } = useBarName();

  const visibleItems = user ? navItemsForRole(user.role) : [];

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-brand-gradient text-white shadow-2xl transition-transform lg:static lg:translate-x-0 lg:shadow-none',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Brand */}
        <div className="flex h-16 items-center justify-between px-5">
          <Link
            href={user ? defaultHomePath(user.role) : '/dashboard'}
            className="flex min-w-0 items-center gap-2.5"
            title={barName}
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/95 p-1 shadow-md">
              <Image
                src="/branding/diamond-luxea-logo.png"
                alt="Diamond Luxea"
                width={36}
                height={36}
                className="h-full w-full object-contain"
              />
            </span>
            <span className="truncate font-display text-base font-bold tracking-tight">
              {barName}
            </span>
          </Link>
          <button className="rounded-md p-1 hover:bg-white/10 lg:hidden" onClick={onClose}>
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mx-4 h-px bg-white/15" />

        {/* Nav */}
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
                  'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all',
                  isActive
                    ? 'bg-white text-primary shadow-sm'
                    : 'text-white/80 hover:bg-white/10 hover:text-white'
                )}
              >
                <Icon
                  className={cn(
                    'h-5 w-5 shrink-0 transition-colors',
                    isActive ? 'text-primary' : 'text-white/70 group-hover:text-white'
                  )}
                />
                {item.label}
              </Link>
            );
          })}

          <div className="my-2 h-px bg-white/15" />
          <InstallAppButton onSelect={onClose} />
        </nav>

        {/* User */}
        <div className="p-3">
          <div className="flex items-center gap-3 rounded-xl bg-white/10 px-3 py-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/90 text-xs font-bold text-primary">
              {initials(user?.fullName)}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">{user?.fullName}</p>
              <p className="text-xs capitalize text-white/70">{user?.role?.toLowerCase()}</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
