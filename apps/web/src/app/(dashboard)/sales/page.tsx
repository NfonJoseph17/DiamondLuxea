'use client';

import { PosSalesView } from '@/components/sales/pos-sales-view';
import { InstallAppCard } from '@/components/app/install-app-card';
import { useAuth } from '@/lib/auth/auth-context';

export default function SalesPage() {
  const { user } = useAuth();
  const isSalesOnly = user?.role === 'SALES';

  return (
    <div className="flex min-h-0 flex-1 flex-col space-y-2">
      <div className="shrink-0">
        <h2 className="font-display text-2xl font-bold tracking-tight text-foreground">
          Sell drinks
        </h2>
      </div>
      <PosSalesView />
      {/* SALES users land here (no dashboard access) — offer app install on their home */}
      {isSalesOnly && (
        <div className="pt-2">
          <InstallAppCard />
        </div>
      )}
    </div>
  );
}
