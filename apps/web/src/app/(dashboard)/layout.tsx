'use client';

import { useState } from 'react';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { AuthGuard } from '@/lib/auth/auth-guard';
import { SalesOnlyRouteGuard } from '@/components/layout/sales-only-route-guard';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <AuthGuard>
      <SalesOnlyRouteGuard>
        <div className="flex h-screen overflow-hidden">
          <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
          <div className="flex flex-1 flex-col overflow-hidden">
            <Header onMenuClick={() => setSidebarOpen(true)} />
            <main className="flex-1 overflow-auto p-4 lg:p-6">{children}</main>
          </div>
        </div>
      </SalesOnlyRouteGuard>
    </AuthGuard>
  );
}
