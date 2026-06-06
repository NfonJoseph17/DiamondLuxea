'use client';

import { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth/auth-context';
import { useBalances } from '@/lib/hooks/use-inventory';
import { useSales } from '@/lib/hooks/use-sales';
import { useExpenditures } from '@/lib/hooks/use-expenditures';
import {
  Package,
  TrendingUp,
  DollarSign,
  AlertTriangle,
  ShoppingCart,
  Receipt,
  Pencil,
  Wallet,
} from 'lucide-react';
import Link from 'next/link';
import { ReceiptDialog } from '@/components/sales/receipt-dialog';
import { EditSaleDialog } from '@/components/sales/edit-sale-dialog';
import { formatStockQuantityMixed, formatUnitLabel } from '@/lib/utils/units';
import type { Sale } from '@/types';

function formatXaf(n: number) {
  return n.toLocaleString('fr-CM', {
    style: 'currency',
    currency: 'XAF',
    maximumFractionDigits: 0,
  });
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { data: balances, isLoading: balancesLoading } = useBalances();
  const { data: sales } = useSales();

  const isManager = user?.role === 'MANAGER';

  const expenditureQuery = useMemo(() => {
    const tzOffset = -new Date().getTimezoneOffset();
    const d = new Date();
    const ymd = (x: Date) =>
      `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
    const monthStart = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
    return { from: monthStart, to: ymd(d), tzOffset };
  }, []);

  const { data: monthExpenditures } = useExpenditures(isManager ? expenditureQuery : undefined);

  const expenditureToday = useMemo(() => {
    if (!monthExpenditures) return 0;
    const todayStr = new Date().toDateString();
    return monthExpenditures
      .filter((e) => new Date(e.spentAt).toDateString() === todayStr)
      .reduce((s, e) => s + parseFloat(e.amount || '0'), 0);
  }, [monthExpenditures]);

  const expenditureMonth = useMemo(() => {
    if (!monthExpenditures) return 0;
    return monthExpenditures.reduce((s, e) => s + parseFloat(e.amount || '0'), 0);
  }, [monthExpenditures]);

  const todaySales =
    sales?.filter((s) => new Date(s.soldAt).toDateString() === new Date().toDateString()) ?? [];
  const todayTotal = todaySales.reduce((sum, s) => sum + parseFloat(s.totalAmount || '0'), 0);

  const todayProfit = useMemo(() => {
    let profit = 0;
    for (const sale of todaySales) {
      for (const item of sale.items ?? []) {
        const revenue = parseFloat(item.subtotal || '0') || item.quantity * parseFloat(item.unitSellingPrice || '0');
        const cost = item.quantity * parseFloat(item.unitPurchasePriceSnapshot || '0');
        profit += revenue - cost;
      }
    }
    return profit;
  }, [todaySales]);

  const lowStockProducts = useMemo(() => {
    if (!balances) return [];
    const byProduct = new Map<
      string,
      { productId: string; name: string; quantityInStorage: number; baseUnitName: string; baseUnitConversionValue: number; lowStockLevel: number }
    >();
    for (const b of balances) {
      const p = b.product;
      if (!p) continue;
      const existing = byProduct.get(b.productId);
      const baseUnit = p.baseUnit;
      const baseUnitName = baseUnit?.name ?? p.unitType ?? 'unit';
      const baseUnitConversionValue = baseUnit?.conversionValue ?? 1;
      if (existing) {
        existing.quantityInStorage += b.quantity;
      } else {
        byProduct.set(b.productId, {
          productId: b.productId,
          name: p.name,
          quantityInStorage: b.quantity,
          baseUnitName,
          baseUnitConversionValue,
          lowStockLevel: p.lowStockLevel ?? 0,
        });
      }
    }
    return Array.from(byProduct.values())
      .filter((row) => row.quantityInStorage <= row.lowStockLevel * row.baseUnitConversionValue)
      .sort((a, b) => a.quantityInStorage - b.quantityInStorage);
  }, [balances]);

  const canBuyStock = isManager;

  const [receiptSale, setReceiptSale] = useState<Sale | null>(null);
  const [editSale, setEditSale] = useState<Sale | null>(null);

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div>
        <h2 className="font-display text-2xl font-bold tracking-tight text-foreground">
          Welcome back{user?.fullName ? `, ${user.fullName.split(' ')[0]}` : ''}
        </h2>
        <p className="text-sm text-muted-foreground">Here&apos;s what&apos;s happening today.</p>
      </div>

      {/* Quick actions */}
      <div>
        <h3 className="mb-3 text-sm font-medium text-muted-foreground">Quick actions</h3>
        <div className="flex flex-wrap gap-2">
          <Button asChild size="sm" variant="default">
            <Link href="/sales">
              <ShoppingCart className="mr-2 h-4 w-4" />
              New sale
            </Link>
          </Button>
          {canBuyStock && (
            <Button asChild size="sm" variant="outline">
              <Link href="/purchases">
                <Package className="mr-2 h-4 w-4" />
                Buy stock
              </Link>
            </Button>
          )}
          {isManager && (
            <Button asChild size="sm" variant="outline">
              <Link href="/expenditures">
                <Wallet className="mr-2 h-4 w-4" />
                Add expenditure
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* Stats cards: Manager = Today's Sales + Today's Profit; Cashier = Today's Sales only */}
      <div className={`grid gap-4 ${isManager ? 'sm:grid-cols-2' : 'sm:grid-cols-1'}`}>
        <Card className="card-hover overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Today&apos;s Sales</CardTitle>
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <TrendingUp className="h-5 w-5" />
            </span>
          </CardHeader>
          <CardContent>
            <div className="font-display text-3xl font-bold tracking-tight">{formatXaf(todayTotal)}</div>
            <p className="mt-1 text-xs text-muted-foreground">
              {todaySales.length} sale{todaySales.length !== 1 ? 's' : ''} today
            </p>
          </CardContent>
        </Card>
        {isManager && (
          <Card className="card-hover overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Today&apos;s Profit</CardTitle>
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
                <DollarSign className="h-5 w-5" />
              </span>
            </CardHeader>
            <CardContent>
              <div className="font-display text-3xl font-bold tracking-tight">{formatXaf(todayProfit)}</div>
              <p className="mt-1 text-xs text-muted-foreground">
                From today&apos;s sales
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {isManager && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expenditures</CardTitle>
            <Wallet className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-1">
              <div className="text-2xl font-bold">{formatXaf(expenditureToday)}</div>
              <p className="text-xs text-muted-foreground">Recorded today (bills &amp; costs)</p>
              <div className="text-lg font-semibold text-muted-foreground">
                This month: {formatXaf(expenditureMonth)}
              </div>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href="/expenditures">Manage expenditures</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Need Restocking: Manager only, detailed */}
      {isManager && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              Need Restocking
            </CardTitle>
            <CardDescription>
              Products at or below low stock level
            </CardDescription>
          </CardHeader>
          <CardContent>
            {balancesLoading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : lowStockProducts.length === 0 ? (
              <p className="text-sm text-muted-foreground">All products in stock.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="pb-2 pr-4">Product</th>
                      <th className="pb-2 pr-4">Unit</th>
                      <th className="pb-2 pr-4 text-right">Current</th>
                      <th className="pb-2 pr-4 text-right">Low level</th>
                      <th className="pb-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lowStockProducts.map((row) => {
                      const displayQuantity = row.quantityInStorage / row.baseUnitConversionValue;
                      const stockDisplay = formatStockQuantityMixed(
                        row.quantityInStorage,
                        row.baseUnitName,
                        row.baseUnitConversionValue
                      );
                      return (
                        <tr key={row.productId} className="border-b last:border-0">
                          <td className="py-2 pr-4 font-medium">{row.name}</td>
                          <td className="py-2 pr-4 text-muted-foreground">
                            {formatUnitLabel(row.baseUnitName, Math.abs(displayQuantity) !== 1)}
                          </td>
                          <td className="py-2 pr-4 text-right">{stockDisplay}</td>
                          <td className="py-2 pr-4 text-right text-muted-foreground">{row.lowStockLevel}</td>
                          <td className="py-2">
                            <span
                              className={
                                row.quantityInStorage === 0
                                  ? 'rounded bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700'
                                  : 'rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700'
                              }
                            >
                              {row.quantityInStorage === 0 ? 'Out of stock' : 'Low stock'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Recent sales */}
      <Card>
        <CardHeader>
          <CardTitle>Recent sales today</CardTitle>
          <CardDescription>Latest transactions</CardDescription>
        </CardHeader>
        <CardContent>
          {todaySales.length > 0 ? (
            <div className="space-y-2">
              {todaySales.slice(0, 8).map((sale) => (
                <div
                  key={sale.id}
                  className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm"
                >
                  <div className="min-w-0 flex-1">
                    <span className="text-muted-foreground">
                      {sale.items?.length ?? 0} item{(sale.items?.length ?? 0) !== 1 ? 's' : ''}
                    </span>
                    {sale.notes && (
                      <span className="ml-2 font-medium text-foreground">— {sale.notes}</span>
                    )}
                  </div>
                  <span className="font-medium shrink-0">
                    {parseFloat(sale.totalAmount || '0').toLocaleString('fr-CM', {
                      style: 'currency',
                      currency: 'XAF',
                      maximumFractionDigits: 0,
                    })}
                  </span>
                  <button
                    onClick={() => setEditSale(sale)}
                    className="shrink-0 rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                    title="Edit receipt"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setReceiptSale(sale)}
                    className="shrink-0 rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                    title="View receipt"
                  >
                    <Receipt className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No sales recorded today yet.</p>
          )}
        </CardContent>
      </Card>

      <ReceiptDialog
        open={!!receiptSale}
        sale={receiptSale}
        onClose={() => setReceiptSale(null)}
      />
      <EditSaleDialog
        open={!!editSale}
        sale={editSale}
        onClose={() => setEditSale(null)}
        onSaved={() => setEditSale(null)}
      />
    </div>
  );
}
