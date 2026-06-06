'use client';

import { PosSalesView } from '@/components/sales/pos-sales-view';

export default function SalesPage() {
  return (
    <div className="flex min-h-0 flex-1 flex-col space-y-2">
      <div className="shrink-0">
        <h2 className="font-display text-2xl font-bold tracking-tight text-foreground">
          Sell drinks
        </h2>
      </div>
      <PosSalesView />
    </div>
  );
}
