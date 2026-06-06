'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { useProducts } from '@/lib/hooks/use-products';
import { useUnits } from '@/lib/hooks/use-units';
import { useBalances } from '@/lib/hooks/use-inventory';
import { useAdjustments, useCreateAdjustment } from '@/lib/hooks/use-adjustments';
import { toast } from '@/components/ui/toaster';
import { reportMutationError } from '@/lib/utils/mutation-feedback';
import { Scale, Loader2, Plus, Minus } from 'lucide-react';
import { formatUnitLabel } from '@/lib/utils/units';
import type { AdjustmentType, AdjustmentReasonType, StockAdjustment } from '@/types';

const ADJUSTMENT_TYPES: { value: AdjustmentType; label: string }[] = [
  { value: 'INCREASE', label: 'Add stock' },
  { value: 'DECREASE', label: 'Remove stock' },
];

const REASON_OPTIONS: { value: AdjustmentReasonType; label: string }[] = [
  { value: 'BREAKAGE', label: 'Breakage' },
  { value: 'LOSS', label: 'Loss' },
  { value: 'DAMAGE', label: 'Damage' },
  { value: 'COUNT_CORRECTION', label: 'Count correction' },
  { value: 'OTHER', label: 'Other' },
];

function getAdjustmentDisplayQuantity(adj: StockAdjustment): { qty: number; unitLabel: string } {
  const conv = adj.unitConversionValueSnapshot ?? 1;
  const qty = adj.quantity / conv;
  const unitName = adj.unitNameSnapshot ?? adj.product?.baseUnit?.name ?? adj.product?.unitType ?? 'unit';
  return { qty, unitLabel: formatUnitLabel(unitName, Math.abs(qty) !== 1) };
}

export default function AdjustmentsPage() {
  const { data: products, isLoading: productsLoading } = useProducts();
  const { data: units } = useUnits();
  const { data: balances } = useBalances();
  const { data: adjustments, isLoading: adjustmentsLoading } = useAdjustments();
  const createAdjustment = useCreateAdjustment();

  const [productId, setProductId] = useState('');
  const [adjustmentType, setAdjustmentType] = useState<AdjustmentType>('DECREASE');
  const [quantityInput, setQuantityInput] = useState('1');
  const [unitId, setUnitId] = useState('');
  const [reasonType, setReasonType] = useState<AdjustmentReasonType>('COUNT_CORRECTION');
  const [notes, setNotes] = useState('');

  const selectedProduct = useMemo(
    () => products?.find((p) => p.id === productId),
    [products, productId]
  );

  const defaultUnit = useMemo(
    () => units?.find((u) => u.name.toLowerCase() === 'bottle') ?? selectedProduct?.baseUnit ?? units?.[0],
    [units, selectedProduct]
  );

  const selectedUnit = useMemo(
    () => (unitId ? units?.find((u) => u.id === unitId) : defaultUnit) ?? defaultUnit,
    [units, unitId, defaultUnit]
  );

  const productStock = useMemo(() => {
    if (!balances || !productId) return 0;
    return balances
      .filter((b) => b.productId === productId)
      .reduce((sum, b) => sum + b.quantity, 0);
  }, [balances, productId]);

  const quantity = Math.max(1, parseInt(quantityInput, 10) || 1);
  const quantityInBaseUnits = selectedUnit ? quantity * selectedUnit.conversionValue : quantity;
  const baseUnitName = selectedProduct?.baseUnit?.name ?? selectedProduct?.unitType ?? 'unit';

  function resetForm() {
    setProductId('');
    setAdjustmentType('DECREASE');
    setQuantityInput('1');
    setUnitId('');
    setReasonType('COUNT_CORRECTION');
    setNotes('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!productId) {
      toast('Select a product', 'error');
      return;
    }
    if (adjustmentType === 'DECREASE' && productStock < quantityInBaseUnits) {
      toast(
        `Not enough stock. Current: ${productStock} ${formatUnitLabel(baseUnitName, productStock !== 1)}`,
        'error'
      );
      return;
    }

    try {
      const product = selectedProduct;
      const adj = await createAdjustment.mutateAsync({
        productId,
        adjustmentType,
        reasonType,
        quantity,
        unitId: selectedUnit?.id || undefined,
        note: notes.trim() || undefined,
        _offlineAdjustment: {
          productName: product?.name ?? 'Product',
          unitName: selectedUnit?.name ?? product?.baseUnit?.name ?? null,
          unitConversionValue:
            selectedUnit?.conversionValue ?? product?.baseUnit?.conversionValue ?? 1,
        },
      });
      const offlineSaved = adj.id.startsWith('offline-');
      toast(
        offlineSaved
          ? 'Correction saved offline — will sync when you are online'
          : `Stock ${adjustmentType === 'INCREASE' ? 'added' : 'removed'} successfully`,
        'success'
      );
      resetForm();
    } catch (err) {
      reportMutationError(err, 'Failed to apply correction');
    }
  }

  const activeProducts = products?.filter((p) => p.isActive) ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Stock Corrections</h2>
        <p className="text-muted-foreground">
          Fix stock counts when they don&apos;t match reality (breakage, loss, recount)
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center gap-3">
          <Scale className="h-6 w-6 text-muted-foreground" />
          <div>
            <CardTitle>Correct stock</CardTitle>
            <CardDescription>
              Add or remove stock. Stock cannot go below zero.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="product">Product</Label>
                <Select
                  id="product"
                  value={productId}
                  onChange={(e) => {
                    setProductId(e.target.value);
                    setUnitId('');
                  }}
                  required
                  disabled={productsLoading}
                >
                  <option value="">Select product</option>
                  {activeProducts.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </Select>
                {productId && (
                  <p className="text-xs text-muted-foreground">
                    Current stock: {productStock} {formatUnitLabel(baseUnitName, productStock !== 1)}
                    {selectedUnit && selectedUnit.conversionValue > 1 && (
                      <span className="ml-1">
                        ({Math.floor(productStock / selectedUnit.conversionValue)} {formatUnitLabel(selectedUnit.name, Math.floor(productStock / selectedUnit.conversionValue) !== 1)})
                      </span>
                    )}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="type">Correction type</Label>
                <Select
                  id="type"
                  value={adjustmentType}
                  onChange={(e) => setAdjustmentType(e.target.value as AdjustmentType)}
                >
                  {ADJUSTMENT_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="quantity">Quantity</Label>
                <div className="flex gap-2">
                  <Input
                    id="quantity"
                    type="number"
                    min={1}
                    value={quantityInput}
                    onChange={(e) => setQuantityInput(e.target.value)}
                    required
                    className="flex-1"
                  />
                  <Select
                    id="unit"
                    value={unitId || defaultUnit?.id || ''}
                    onChange={(e) => setUnitId(e.target.value)}
                    disabled={!selectedProduct}
                    className="w-[140px]"
                  >
                    <option value="">Select unit</option>
                    {units?.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.conversionValue})
                      </option>
                    ))}
                  </Select>
                </div>
                {selectedProduct && selectedUnit && (
                  <p className="text-xs text-muted-foreground">
                    = {quantityInBaseUnits} {formatUnitLabel(baseUnitName, quantityInBaseUnits !== 1)} in stock
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="reason">Reason</Label>
                <Select
                  id="reason"
                  value={reasonType}
                  onChange={(e) => setReasonType(e.target.value as AdjustmentReasonType)}
                >
                  {REASON_OPTIONS.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes (optional)</Label>
              <Input
                id="notes"
                placeholder="e.g. Found 3 broken bottles during count"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            {adjustmentType === 'DECREASE' && productId && productStock < quantityInBaseUnits && (
              <p className="text-sm text-destructive">
                Cannot remove {quantity} {selectedUnit ? formatUnitLabel(selectedUnit.name, quantity !== 1) : baseUnitName}
                {' '}(= {quantityInBaseUnits} {formatUnitLabel(baseUnitName, quantityInBaseUnits !== 1)}). Only{' '}
                {productStock} in stock.
              </p>
            )}

            <div className="flex gap-2">
              <Button
                type="submit"
                disabled={
                  !productId ||
                  !selectedUnit ||
                  createAdjustment.isPending ||
                  (adjustmentType === 'DECREASE' && productStock < quantityInBaseUnits)
                }
              >
                {createAdjustment.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : adjustmentType === 'INCREASE' ? (
                  <Plus className="mr-2 h-4 w-4" />
                ) : (
                  <Minus className="mr-2 h-4 w-4" />
                )}
                Apply correction
              </Button>
              <Button type="button" variant="outline" onClick={resetForm}>
                Reset
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent corrections</CardTitle>
          <CardDescription>History of stock adjustments</CardDescription>
        </CardHeader>
        <CardContent>
          {adjustmentsLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : adjustments && adjustments.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 pr-4">Date</th>
                    <th className="pb-2 pr-4">Product</th>
                    <th className="pb-2 pr-4">Action</th>
                    <th className="pb-2 pr-4">Quantity</th>
                    <th className="pb-2 pr-4">Unit</th>
                    <th className="pb-2 pr-4">Reason</th>
                    <th className="pb-2 pr-4">Notes</th>
                    <th className="pb-2">User</th>
                  </tr>
                </thead>
                <tbody>
                  {adjustments.map((adj) => (
                    <tr key={adj.id} className="border-b last:border-0">
                      <td className="py-2 pr-4 whitespace-nowrap">
                        {new Date(adj.adjustedAt).toLocaleString('en-GB', {
                          dateStyle: 'short',
                          timeStyle: 'short',
                        })}
                      </td>
                      <td className="py-2 pr-4">
                        {adj.product?.name ?? adj.productId}
                      </td>
                      <td className="py-2 pr-4">
                        <span
                          className={
                            adj.adjustmentType === 'INCREASE'
                              ? 'text-green-600 font-medium'
                              : 'text-red-600 font-medium'
                          }
                        >
                          {adj.adjustmentType === 'INCREASE' ? 'Add' : 'Remove'}
                        </span>
                      </td>
                      <td className="py-2 pr-4">
                        {getAdjustmentDisplayQuantity(adj).qty}
                      </td>
                      <td className="py-2 pr-4 text-muted-foreground">
                        {getAdjustmentDisplayQuantity(adj).unitLabel}
                      </td>
                      <td className="py-2 pr-4">
                        {REASON_OPTIONS.find((r) => r.value === adj.reasonType)?.label ??
                          adj.reasonType}
                      </td>
                      <td className="py-2 pr-4 text-muted-foreground max-w-[180px] truncate">
                        {adj.note || '—'}
                      </td>
                      <td className="py-2">{adj.createdBy?.fullName ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No corrections yet. Use the form above to add or remove stock.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
