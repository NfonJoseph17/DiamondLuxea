'use client';

import { useState, useMemo, useEffect } from 'react';
import { Dialog, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { useProducts } from '@/lib/hooks/use-products';
import { useSuppliers } from '@/lib/hooks/use-suppliers';
import { useUnits } from '@/lib/hooks/use-units';
import { useUpdatePurchase } from '@/lib/hooks/use-purchases';
import { toast } from '@/components/ui/toaster';
import { reportMutationError } from '@/lib/utils/mutation-feedback';
import { isOfflineQueuedError } from '@/lib/offline/errors';
import { Loader2, Plus, Trash2, Pencil } from 'lucide-react';
import { derivePurchaseUnitPrice } from '@/lib/utils/pricing';
import type { Purchase, PurchaseItem } from '@/types';

interface CartItem {
  productId: string;
  productName: string;
  quantity: number;
  unitId: string;
  unitName: string;
  unitPurchasePrice: number;
}

function purchaseItemsToCart(items: PurchaseItem[]): CartItem[] {
  const byKey = new Map<string, CartItem>();
  for (const item of items) {
    const unitId = item.unitId ?? item.unit?.id;
    if (!unitId) continue;
    const key = `${item.productId}-${unitId}`;
    const existing = byKey.get(key);
    const qty = item.quantity;
    const price = parseFloat(item.unitPurchasePrice || '0');
    const name = item.product?.name ?? item.productId;
    const unitName = item.unitNameSnapshot ?? item.unit?.name ?? 'Unit';
    if (existing) {
      existing.quantity += qty;
    } else {
      byKey.set(key, {
        productId: item.productId,
        productName: name,
        quantity: qty,
        unitId,
        unitName,
        unitPurchasePrice: price,
      });
    }
  }
  return Array.from(byKey.values());
}

interface EditPurchaseDialogProps {
  open: boolean;
  purchase: Purchase | null;
  onClose: () => void;
  onSaved?: () => void;
}

export function EditPurchaseDialog({ open, purchase, onClose, onSaved }: EditPurchaseDialogProps) {
  const { data: products } = useProducts();
  const { data: suppliers } = useSuppliers();
  const { data: units } = useUnits();
  const updatePurchase = useUpdatePurchase();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [supplierId, setSupplierId] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedUnitId, setSelectedUnitId] = useState('');
  const [quantityInput, setQuantityInput] = useState('1');

  const defaultUnit = useMemo(
    () => units?.find((u) => u.name.toLowerCase() === 'bottle') ?? units?.[0],
    [units]
  );

  useEffect(() => {
    if (purchase && open) {
      setCart(purchaseItemsToCart(purchase.items ?? []));
      setSupplierId(purchase.supplierId ?? '');
      setNotes(purchase.notes ?? '');
    }
  }, [purchase, open]);

  const selectedProduct = useMemo(
    () => products?.find((p) => p.id === selectedProductId),
    [products, selectedProductId]
  );

  const currentPrice = selectedProduct?.priceHistory?.[0];

  const total = cart.reduce((sum, item) => sum + item.quantity * item.unitPurchasePrice, 0);
  const quantity = Math.max(1, parseInt(quantityInput, 10) || 1);

  function addToCart() {
    const unitId = selectedUnitId || defaultUnit?.id;
    const baseUnit = selectedProduct?.baseUnit;
    if (!selectedProductId || !currentPrice || !unitId || quantity < 1 || !baseUnit) return;
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

  function updateQuantity(productId: string, unitId: string, newQty: number) {
    const q = Math.max(0, newQty);
    if (q === 0) {
      removeFromCart(productId, unitId);
      return;
    }
    setCart(
      cart.map((i) =>
        i.productId === productId && i.unitId === unitId ? { ...i, quantity: q } : i
      )
    );
  }

  async function handleSave() {
    if (!purchase || cart.length === 0) {
      toast('Add at least one item', 'error');
      return;
    }
    try {
      await updatePurchase.mutateAsync({
        id: purchase.id,
        data: {
          supplierId: supplierId || undefined,
          notes: notes || undefined,
          items: cart.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            unitId: item.unitId,
          })),
        },
      });
      toast('Purchase updated successfully', 'success');
      onSaved?.();
      onClose();
    } catch (err) {
      reportMutationError(err, 'Failed to update purchase');
      // Offline-queued counts as saved — close like a normal save.
      if (isOfflineQueuedError(err)) {
        onSaved?.();
        onClose();
      }
    }
  }

  if (!purchase) return null;

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Pencil className="h-5 w-5" />
          Edit Purchase
        </DialogTitle>
      </DialogHeader>
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Supplier</Label>
          <Select value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
            <option value="">None</option>
            {suppliers?.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </Select>
        </div>

        <div className="flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-end">
          <div className="flex-1 space-y-2">
            <Label>Product</Label>
            <Select value={selectedProductId} onChange={(e) => setSelectedProductId(e.target.value)}>
              <option value="">Select product</option>
              {products?.filter((p) => p.isActive).map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Unit</Label>
            <Select value={selectedUnitId || defaultUnit?.id || ''} onChange={(e) => setSelectedUnitId(e.target.value)}>
              <option value="">Select unit</option>
              {units?.map((u) => (
                <option key={u.id} value={u.id}>{u.name} ({u.conversionValue})</option>
              ))}
            </Select>
          </div>
          <div className="w-20 space-y-2">
            <Label>Qty</Label>
            <Input type="number" min={1} value={quantityInput} onChange={(e) => setQuantityInput(e.target.value)} />
          </div>
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
          <div className="overflow-x-auto max-h-48 overflow-y-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground sticky top-0 bg-background">
                  <th className="pb-2 pr-2">Product</th>
                  <th className="pb-2 pr-2 text-right">Unit</th>
                  <th className="pb-2 pr-2 text-right">Qty</th>
                  <th className="pb-2 pr-2 text-right">Unit Price</th>
                  <th className="pb-2 pr-2 text-right">Line Total</th>
                  <th className="pb-2"></th>
                </tr>
              </thead>
              <tbody>
                {cart.map((item) => (
                  <tr key={`${item.productId}-${item.unitId}`} className="border-b last:border-0">
                    <td className="py-1.5 pr-2">{item.productName}</td>
                    <td className="py-1.5 pr-2 text-right text-muted-foreground">{item.unitName}</td>
                    <td className="py-1.5 pr-2 text-right">
                      <Input
                        type="number"
                        min={1}
                        className="h-8 w-16 text-right"
                        value={item.quantity}
                        onChange={(e) =>
                          updateQuantity(item.productId, item.unitId, parseInt(e.target.value, 10) || 0)
                        }
                      />
                    </td>
                    <td className="py-1.5 pr-2 text-right">{item.unitPurchasePrice.toLocaleString()} XAF</td>
                    <td className="py-1.5 pr-2 text-right font-medium">
                      {(item.quantity * item.unitPurchasePrice).toLocaleString()} XAF
                    </td>
                    <td className="py-1.5">
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
            </table>
          </div>
        )}

        <div className="space-y-2">
          <Label>Notes</Label>
          <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional notes" />
        </div>

        <div className="flex justify-between items-center pt-2 border-t">
          <span className="font-medium">Total: {total.toLocaleString()} XAF</span>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={cart.length === 0 || updatePurchase.isPending}>
              {updatePurchase.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save changes
            </Button>
          </div>
        </div>
      </div>
    </Dialog>
  );
}
