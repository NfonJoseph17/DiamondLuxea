'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { useProducts } from '@/lib/hooks/use-products';
import { useSuppliers, useCreateSupplier } from '@/lib/hooks/use-suppliers';
import { useUnits } from '@/lib/hooks/use-units';
import { useCreatePurchase, usePurchases } from '@/lib/hooks/use-purchases';
import { toast } from '@/components/ui/toaster';
import { ApiError } from '@/lib/api/client';
import { Loader2, Plus, Trash2, ShoppingCart, Pencil, ChevronDown, ChevronUp } from 'lucide-react';
import { AddSupplierDialog } from '@/components/purchases/add-supplier-dialog';
import { EditPurchaseDialog } from '@/components/purchases/edit-purchase-dialog';
import { formatUnitLabel } from '@/lib/utils/units';
import { derivePurchaseUnitPrice, deriveSaleUnitPrice } from '@/lib/utils/pricing';
import type { Purchase } from '@/types';

interface CartItem {
  productId: string;
  productName: string;
  quantity: number;
  unitId: string;
  unitName: string;
  unitPurchasePrice: number;
}

export default function PurchasesPage() {
  const { data: products, isLoading: productsLoading } = useProducts();
  const { data: suppliers, isLoading: suppliersLoading } = useSuppliers();
  const { data: units } = useUnits();
  const { data: recentPurchases } = usePurchases();
  const createPurchase = useCreatePurchase();
  const createSupplier = useCreateSupplier();

  const [supplierId, setSupplierId] = useState('');
  const [showAddSupplier, setShowAddSupplier] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedUnitId, setSelectedUnitId] = useState('');
  const [quantityInput, setQuantityInput] = useState('1');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editPurchase, setEditPurchase] = useState<Purchase | null>(null);
  const [expandedPurchaseId, setExpandedPurchaseId] = useState<string | null>(null);

  const selectedProduct = useMemo(
    () => products?.find((p) => p.id === selectedProductId),
    [products, selectedProductId]
  );

  const currentPrice = selectedProduct?.priceHistory?.[0];
  const defaultUnit = useMemo(
    () => units?.find((u) => u.name.toLowerCase() === 'bottle') ?? selectedProduct?.baseUnit ?? units?.[0],
    [units, selectedProduct]
  );

  const total = cart.reduce((sum, item) => sum + item.quantity * item.unitPurchasePrice, 0);
  const quantity = Math.max(1, parseInt(quantityInput, 10) || 1);

  function addToCart() {
    const unitId = selectedUnitId || defaultUnit?.id;
    const baseUnit = selectedProduct?.baseUnit;
    if (!selectedProductId || !currentPrice || quantity < 1 || !baseUnit || !unitId) return;

    const unit = units?.find((u) => u.id === unitId);
    if (!unit) return;

    const purchasePrice = parseFloat(currentPrice.purchasePrice);
    const unitPurchasePrice = derivePurchaseUnitPrice(
      purchasePrice,
      baseUnit.conversionValue,
      unit.conversionValue,
    );

    const existing = cart.find((i) => i.productId === selectedProductId && i.unitId === unitId);
    if (existing) {
      setCart(
        cart.map((i) =>
          i.productId === selectedProductId && i.unitId === unitId
            ? { ...i, quantity: i.quantity + quantity }
            : i
        )
      );
    } else {
      setCart([
        ...cart,
        {
          productId: selectedProductId,
          productName: selectedProduct!.name,
          quantity,
          unitId,
          unitName: unit.name,
          unitPurchasePrice,
        },
      ]);
    }
    setSelectedProductId('');
    setSelectedUnitId('');
    setQuantityInput('1');
  }

  function removeFromCart(productId: string, unitId: string) {
    setCart(cart.filter((i) => !(i.productId === productId && i.unitId === unitId)));
  }

  async function handleSupplierCreated(supplier: { id: string; name: string }) {
    setSupplierId(supplier.id);
    setShowAddSupplier(false);
  }

  async function submitPurchase() {
    if (cart.length === 0) {
      toast('Add at least one product', 'error');
      return;
    }
    setIsSubmitting(true);
    try {
      const supplierName = suppliers?.find((s) => s.id === supplierId)?.name ?? null;
      const purchase = await createPurchase.mutateAsync({
        supplierId: supplierId || undefined,
        notes: notes || undefined,
        items: cart.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          unitId: item.unitId,
        })),
        _offlinePurchaseLines: cart.map((item) => {
          const unit = units?.find((u) => u.id === item.unitId);
          const product = products?.find((p) => p.id === item.productId);
          const baseUnit = product?.baseUnit;
          const ph = product?.priceHistory?.[0];
          let unitSellingPriceSnapshot = 0;
          if (ph && baseUnit && unit) {
            const retail = parseFloat(ph.retailPrice);
            const wholesale =
              ph.wholesalePrice != null ? parseFloat(ph.wholesalePrice) : retail;
            unitSellingPriceSnapshot = deriveSaleUnitPrice(
              retail,
              wholesale,
              baseUnit.conversionValue,
              unit.conversionValue
            );
          }
          return {
            productId: item.productId,
            productName: item.productName,
            quantity: item.quantity,
            unitId: item.unitId,
            unitName: item.unitName,
            unitPurchasePrice: item.unitPurchasePrice,
            unitSellingPriceSnapshot,
            unitConversionValue: unit?.conversionValue,
          };
        }),
        _offlineSupplierName: supplierName,
      });
      const offlineSaved = purchase.id.startsWith('offline-');
      toast(
        offlineSaved
          ? 'Purchase saved offline — will sync when you are online'
          : 'Purchase recorded successfully',
        'success'
      );
      setCart([]);
      setNotes('');
      setSupplierId('');
    } catch (err) {
      if (err instanceof ApiError) {
        toast(err.message, 'error');
      } else {
        toast('Failed to record purchase', 'error');
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  const todayPurchases = recentPurchases?.filter((p) => {
    const d = new Date(p.purchasedAt).toDateString();
    return d === new Date().toDateString();
  }) ?? [];

  if (productsLoading || suppliersLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Buy Stock</h2>
        <p className="text-muted-foreground">
          Record stock purchases from suppliers. Stock levels update automatically.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>New Purchase</CardTitle>
              <CardDescription>Select supplier, add products, and submit</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Supplier</Label>
                <div className="flex gap-2">
                  <Select
                    value={supplierId}
                    onChange={(e) => setSupplierId(e.target.value)}
                    className="flex-1"
                  >
                    <option value="">Select supplier (optional)</option>
                    {suppliers?.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </Select>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAddSupplier(true)}
                  >
                    Add
                  </Button>
                </div>
              </div>

              <div className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-end">
                <div className="flex-1 space-y-2">
                  <Label>Product</Label>
                  <Select
                    value={selectedProductId}
                    onChange={(e) => {
                      setSelectedProductId(e.target.value);
                      setSelectedUnitId('');
                    }}
                  >
                    <option value="">Select product</option>
                    {products?.filter((p) => p.isActive).map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Unit</Label>
                  <Select
                    value={selectedUnitId || defaultUnit?.id || ''}
                    onChange={(e) => setSelectedUnitId(e.target.value)}
                  >
                    <option value="">Select unit</option>
                    {units?.map((u) => (
                      <option key={u.id} value={u.id}>{u.name} ({u.conversionValue})</option>
                    ))}
                  </Select>
                </div>
                <div className="w-24 space-y-2">
                  <Label>Qty</Label>
                  <Input
                    type="number"
                    min={1}
                    value={quantityInput}
                    onChange={(e) => setQuantityInput(e.target.value)}
                    onBlur={() => {
                      const parsed = parseInt(quantityInput, 10);
                      if (quantityInput === '' || isNaN(parsed) || parsed < 1) {
                        setQuantityInput('1');
                      }
                    }}
                  />
                </div>
                {selectedProduct && currentPrice && (selectedUnitId || defaultUnit?.id) && (() => {
                  const unitId = selectedUnitId || defaultUnit?.id;
                  const unit = units?.find((u) => u.id === unitId);
                  const baseUnit = selectedProduct?.baseUnit;
                  if (!unit || !baseUnit) return null;
                  const price = derivePurchaseUnitPrice(
                    parseFloat(currentPrice.purchasePrice),
                    baseUnit.conversionValue,
                    unit.conversionValue,
                  );
                  return (
                    <div className="text-sm text-muted-foreground">
                      @ {price.toLocaleString()} XAF/{unit.name}
                    </div>
                  );
                })()}
                <Button
                  type="button"
                  size="sm"
                  onClick={addToCart}
                  disabled={!selectedProductId || !currentPrice || !(selectedUnitId || defaultUnit?.id)}
                >
                  <Plus className="mr-1 h-4 w-4" /> Add
                </Button>
              </div>

              {cart.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-muted-foreground">
                        <th className="pb-2 pr-4">Product</th>
                        <th className="pb-2 pr-4 text-right">Qty</th>
                        <th className="pb-2 pr-4 text-right">Unit</th>
                        <th className="pb-2 pr-4 text-right">Unit Price</th>
                        <th className="pb-2 pr-4 text-right">Line Total</th>
                        <th className="pb-2"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {cart.map((item) => (
                        <tr key={`${item.productId}-${item.unitId}`} className="border-b last:border-0">
                          <td className="py-2 pr-4">{item.productName}</td>
                          <td className="py-2 pr-4 text-right">{item.quantity}</td>
                          <td className="py-2 pr-4 text-right">{item.unitName}</td>
                          <td className="py-2 pr-4 text-right">
                            {item.unitPurchasePrice.toLocaleString()} XAF
                          </td>
                          <td className="py-2 pr-4 text-right font-medium">
                            {(item.quantity * item.unitPurchasePrice).toLocaleString()} XAF
                          </td>
                          <td className="py-2">
                            <button
                              onClick={() => removeFromCart(item.productId, item.unitId)}
                              className="text-destructive hover:text-destructive/80"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td colSpan={4} className="pt-3 text-right font-medium">Total:</td>
                        <td className="pt-3 text-right text-lg font-bold">
                          {total.toLocaleString()} XAF
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}

              <div className="space-y-2">
                <Label>Notes (optional)</Label>
                <Input
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any notes for this purchase"
                />
              </div>

              <Button
                className="w-full"
                size="lg"
                onClick={submitPurchase}
                disabled={cart.length === 0 || isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Recording...
                  </>
                ) : (
                  <>
                    <ShoppingCart className="mr-2 h-4 w-4" />
                    Submit Purchase — {total.toLocaleString()} XAF
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Today&apos;s purchases</CardTitle>
            </CardHeader>
            <CardContent>
              {todayPurchases.length > 0 ? (
                <div className="space-y-3">
                  {todayPurchases.slice(0, 10).map((p) => {
                    const items = p.items || [];
                    const totalAmt = items.reduce(
                      (s, i) => s + parseFloat(i.subtotal || '0'),
                      0
                    );
                    return (
                      <div key={p.id} className="rounded-lg border">
                        <div
                          className="flex cursor-pointer items-center justify-between gap-2 p-2 text-sm hover:bg-muted/50"
                          onClick={() => setExpandedPurchaseId(expandedPurchaseId === p.id ? null : p.id)}
                        >
                          <div className="min-w-0 flex-1">
                            <span className="text-muted-foreground">
                              {new Date(p.purchasedAt).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                            <span className="ml-2">
                              {p.supplier?.name ?? 'No supplier'}
                            </span>
                            <span className="ml-2">
                              {items.length} item{items.length !== 1 ? 's' : ''}
                              {p.notes && (
                                <span className="ml-1 text-muted-foreground">— {p.notes}</span>
                              )}
                            </span>
                          </div>
                          <span className="font-medium shrink-0">
                            {totalAmt.toLocaleString()} XAF
                          </span>
                          <span className="text-muted-foreground">
                            {expandedPurchaseId === p.id ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditPurchase(p);
                            }}
                            className="shrink-0 rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                            title="Edit purchase"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                        </div>
                        {expandedPurchaseId === p.id && items.length > 0 && (
                          <div className="border-t bg-muted/30 px-2 py-2">
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="text-left text-muted-foreground">
                                  <th className="pb-1 pr-2">Product</th>
                                  <th className="pb-1 pr-2 text-right">Qty</th>
                                  <th className="pb-1 pr-2 text-right">Unit</th>
                                  <th className="pb-1 pr-2 text-right">Unit Price</th>
                                  <th className="pb-1 text-right">Line Total</th>
                                </tr>
                              </thead>
                              <tbody>
                                {items.map((item) => (
                                  <tr key={item.id}>
                                    <td className="py-0.5 pr-2">{item.product?.name ?? item.productId}</td>
                                    <td className="py-0.5 pr-2 text-right">{item.quantity}</td>
                                    <td className="py-0.5 pr-2 text-right">
                                      {formatUnitLabel(item.unitNameSnapshot ?? 'UNIT', item.quantity !== 1)}
                                    </td>
                                    <td className="py-0.5 pr-2 text-right">
                                      {parseFloat(item.unitPurchasePrice || '0').toLocaleString()} XAF
                                    </td>
                                    <td className="py-0.5 text-right font-medium">
                                      {parseFloat(item.subtotal || '0').toLocaleString()} XAF
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                            <p className="mt-2 text-muted-foreground">
                              Supplier: {p.supplier?.name ?? '—'}
                            </p>
                            {p.notes && (
                              <p className="mt-1 text-muted-foreground">Note: {p.notes}</p>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No purchases recorded today.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <AddSupplierDialog
        open={showAddSupplier}
        onClose={() => setShowAddSupplier(false)}
        onCreated={handleSupplierCreated}
      />
      <EditPurchaseDialog
        open={!!editPurchase}
        purchase={editPurchase}
        onClose={() => setEditPurchase(null)}
        onSaved={() => setEditPurchase(null)}
      />
    </div>
  );
}
