'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useBalances } from '@/lib/hooks/use-inventory';
import { formatStockQuantityMixed, formatUnitLabel } from '@/lib/utils/units';
import { Warehouse, Loader2 } from 'lucide-react';

export default function InventoryPage() {
  const { data: balances, isLoading, error } = useBalances();

  const aggregatedByProduct = useMemo(() => {
    if (!balances) return [];
    const map = new Map<
      string,
      { productId: string; name: string; quantityInStorage: number; baseUnitName: string; baseUnitConversionValue: number }
    >();
    for (const b of balances) {
      const productId = b.productId;
      const name = b.product?.name ?? b.productId;
      const baseUnit = b.product?.baseUnit;
      const baseUnitName = baseUnit?.name ?? b.product?.unitType ?? 'unit';
      const baseUnitConversionValue = baseUnit?.conversionValue ?? 1;
      const existing = map.get(productId);
      if (existing) {
        existing.quantityInStorage += b.quantity;
      } else {
        map.set(productId, {
          productId,
          name,
          quantityInStorage: b.quantity,
          baseUnitName,
          baseUnitConversionValue,
        });
      }
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [balances]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Stock Status</h2>
        <p className="text-muted-foreground">See how much stock you have</p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <Card>
          <CardContent className="py-8 text-center space-y-2">
            <p className="text-sm text-destructive font-medium">Failed to load stock</p>
            <p className="text-xs text-muted-foreground">
              {error instanceof Error ? error.message : 'Please try again.'}
            </p>
            <p className="text-xs text-muted-foreground">
              Ensure the database is migrated and seeded (see README).
            </p>
          </CardContent>
        </Card>
      ) : aggregatedByProduct.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Stock</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 pr-4">Product</th>
                    <th className="pb-2 pr-4">Unit</th>
                    <th className="pb-2 text-right">Stock</th>
                  </tr>
                </thead>
                <tbody>
                  {aggregatedByProduct.map((row) => {
                    const displayQuantity = row.quantityInStorage / row.baseUnitConversionValue;
                    const stockDisplay = formatStockQuantityMixed(
                      row.quantityInStorage,
                      row.baseUnitName,
                      row.baseUnitConversionValue
                    );
                    return (
                      <tr key={row.productId} className="border-b last:border-0">
                        <td className="py-2 pr-4">{row.name}</td>
                        <td className="py-2 pr-4 text-muted-foreground">
                          {formatUnitLabel(row.baseUnitName, Math.abs(displayQuantity) !== 1)}
                        </td>
                        <td className="py-2 text-right font-medium">
                          {stockDisplay}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12">
            <Warehouse className="h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No stock recorded yet.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
