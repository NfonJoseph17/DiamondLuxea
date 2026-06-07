'use client';

import { useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/lib/auth/auth-context';
import { useProducts } from '@/lib/hooks/use-products';
import { useUnits } from '@/lib/hooks/use-units';
import { useCreateSale, usePatchSalePayment, useSales } from '@/lib/hooks/use-sales';
import { toast } from '@/components/ui/toaster';
import { reportMutationError } from '@/lib/utils/mutation-feedback';
import {
  Loader2,
  Trash2,
  ShoppingCart,
  Receipt,
  Pencil,
  ChevronDown,
  ChevronUp,
  CircleDollarSign,
  Search,
  Minus,
  Plus,
} from 'lucide-react';
import { formatUnitLabel } from '@/lib/utils/units';
import { resolveUnitSellingPrice, derivePurchaseUnitPrice } from '@/lib/utils/pricing';
import { publicProductImageUrl } from '@/lib/utils/product-image';
import { ReceiptDialog } from '@/components/sales/receipt-dialog';
import { EditSaleDialog } from '@/components/sales/edit-sale-dialog';
import { SalePaymentFields, validatePartialPayment } from '@/components/sales/sale-payment-fields';
import type { SalesPaymentReportFilter } from '@/lib/api/reports';
import type { PaymentStatus, Sale, Product, Unit } from '@/types';

interface CartItem {
  productId: string;
  productName: string;
  quantity: number;
  unitId: string;
  unitName: string;
  unitSellingPrice: number;
  imageUrl?: string | null;
}

function formatFcfa(n: number) {
  return `${n.toLocaleString('fr-FR')} FCFA`;
}

function ProductAvatar({
  name,
  imageUrl,
  size = 'lg',
}: {
  name: string;
  imageUrl?: string | null;
  size?: 'sm' | 'lg';
}) {
  const src = publicProductImageUrl(imageUrl);
  const dim = size === 'lg' ? 'h-14 w-14 min-h-14 min-w-14' : 'h-10 w-10 min-h-10 min-w-10';
  if (src) {
    return (
      <img
        src={src}
        alt=""
        className={`${dim} rounded-full object-cover border-2 border-white shadow-sm ring-1 ring-black/5`}
      />
    );
  }
  return (
    <div
      className={`${dim} flex items-center justify-center rounded-full bg-brand-gradient text-lg font-bold text-white shadow-inner`}
    >
      {name.slice(0, 1).toUpperCase()}
    </div>
  );
}

export function PosSalesView() {
  const { user } = useAuth();
  const isSalesOnly = user?.role === 'SALES';
  const { data: products, isLoading: productsLoading } = useProducts();
  const { data: units } = useUnits();
  const { data: recentSales } = useSales();

  const scopedSales = useMemo(() => {
    if (!recentSales || !user) return recentSales;
    if (user.role === 'SALES') {
      return recentSales.filter((s) => s.createdById === user.id);
    }
    return recentSales;
  }, [recentSales, user]);

  const createSale = useCreateSale();
  const patchPayment = usePatchSalePayment();

  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [notes, setNotes] = useState('');
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('PAID');
  const [partialAmountPaid, setPartialAmountPaid] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [receiptSale, setReceiptSale] = useState<Sale | null>(null);
  const [editSale, setEditSale] = useState<Sale | null>(null);
  const [expandedSaleId, setExpandedSaleId] = useState<string | null>(null);
  const [listPaymentFilter, setListPaymentFilter] = useState<SalesPaymentReportFilter>('all');

  const categories = useMemo(() => {
    const set = new Set<string>();
    products?.forEach((p) => set.add(p.category));
    return ['all', ...Array.from(set).sort((a, b) => a.localeCompare(b))];
  }, [products]);

  const activeProducts = useMemo(
    () => products?.filter((p) => p.isActive) ?? [],
    [products]
  );

  const filteredProducts = useMemo(() => {
    let list = activeProducts;
    if (categoryFilter !== 'all') {
      list = list.filter((p) => p.category === categoryFilter);
    }
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.sku?.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q)
      );
    }
    return list;
  }, [activeProducts, categoryFilter, search]);

  const total = cart.reduce((sum, item) => sum + item.quantity * item.unitSellingPrice, 0);

  // The units a product can be sold in, each with its price: the base unit
  // plus any unit that has an explicit per-unit price. One tap = that unit.
  const sellableUnitsFor = useCallback(
    (product: Product): { unit: Unit; price: number }[] => {
      const ph = product.priceHistory?.find((h) => !h.effectiveTo);
      const baseUnit = product.baseUnit;
      if (!ph || !baseUnit || !units) return [];
      const retail = parseFloat(ph.retailPrice ?? '0');
      const wholesale =
        ph.wholesalePrice != null ? parseFloat(ph.wholesalePrice) : retail;

      const ids = new Set<string>([baseUnit.id, ...(product.unitPrices ?? []).map((u) => u.unitId)]);
      const list: { unit: Unit; price: number }[] = [];
      for (const id of ids) {
        const unit = units.find((u) => u.id === id);
        if (!unit) continue;
        list.push({
          unit,
          price: resolveUnitSellingPrice(unit.id, product.unitPrices, {
            retailPrice: retail,
            wholesalePrice: wholesale,
            baseUnitConversionValue: baseUnit.conversionValue,
            unitConversionValue: unit.conversionValue,
          }),
        });
      }
      return list.sort((a, b) => a.unit.conversionValue - b.unit.conversionValue);
    },
    [units]
  );

  const addUnitToCart = useCallback((product: Product, unit: Unit, price: number) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.productId === product.id && i.unitId === unit.id);
      if (existing) {
        return prev.map((i) =>
          i.productId === product.id && i.unitId === unit.id
            ? { ...i, quantity: i.quantity + 1 }
            : i
        );
      }
      return [
        ...prev,
        {
          productId: product.id,
          productName: product.name,
          quantity: 1,
          unitId: unit.id,
          unitName: unit.name,
          unitSellingPrice: price,
          imageUrl: product.imageUrl,
        },
      ];
    });
  }, []);

  function setLineQty(productId: string, unitId: string, qty: number) {
    if (qty < 1) {
      setCart((c) => c.filter((i) => !(i.productId === productId && i.unitId === unitId)));
      return;
    }
    setCart((c) =>
      c.map((i) =>
        i.productId === productId && i.unitId === unitId ? { ...i, quantity: qty } : i
      )
    );
  }

  function removeFromCart(productId: string, unitId: string) {
    setCart((c) => c.filter((i) => !(i.productId === productId && i.unitId === unitId)));
  }

  function clearCart() {
    if (cart.length === 0) return;
    if (!confirm('Clear all items from this sale?')) return;
    setCart([]);
    setNotes('');
    setPaymentStatus('PAID');
    setPartialAmountPaid('');
  }

  async function submitSale() {
    if (cart.length === 0) {
      toast('Add at least one item', 'error');
      return;
    }
    if (paymentStatus === 'PARTIAL') {
      const err = validatePartialPayment(total, partialAmountPaid);
      if (err) {
        toast(err, 'error');
        return;
      }
    }
    setIsSubmitting(true);
    try {
      const sale = await createSale.mutateAsync({
        notes: notes || undefined,
        paymentStatus,
        ...(paymentStatus === 'PARTIAL'
          ? { amountPaid: Number(String(partialAmountPaid).replace(/,/g, '')) }
          : {}),
        items: cart.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          unitId: item.unitId,
        })),
        _offlineSaleLines: cart.map((item) => {
          const unit = units?.find((u) => u.id === item.unitId);
          const product = products?.find((p) => p.id === item.productId);
          const baseUnit = product?.baseUnit;
          const ph = product?.priceHistory?.find((h) => !h.effectiveTo);
          let unitPurchasePrice = 0;
          if (ph && baseUnit && unit) {
            unitPurchasePrice = derivePurchaseUnitPrice(
              parseFloat(ph.purchasePrice),
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
            unitSellingPrice: item.unitSellingPrice,
            unitPurchasePrice,
            unitConversionValue: unit?.conversionValue,
          };
        }),
      });
      const offlineSaved = sale.id.startsWith('offline-');
      toast(
        offlineSaved ? 'Sale saved offline — will sync when you are online' : 'Sale recorded',
        'success'
      );
      setCart([]);
      setNotes('');
      setPaymentStatus('PAID');
      setPartialAmountPaid('');
      setReceiptSale(sale);
      setShowReceipt(true);
    } catch (err) {
      reportMutationError(err, 'Failed to record sale');
    } finally {
      setIsSubmitting(false);
    }
  }

  const todaySales = scopedSales?.filter((s) => {
    return new Date(s.soldAt).toDateString() === new Date().toDateString();
  }) ?? [];

  const filteredTodaySales = useMemo(() => {
    return todaySales.filter((s) => {
      if (listPaymentFilter === 'all') return true;
      const ps = s.paymentStatus ?? 'PAID';
      if (listPaymentFilter === 'paid') return ps === 'PAID';
      return ps === 'UNPAID' || ps === 'PARTIAL';
    });
  }, [todaySales, listPaymentFilter]);

  if (productsLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-0 lg:gap-4">
      {/* Top action bar — POS style */}
      <div className="sticky top-0 z-20 -mx-4 flex shrink-0 shadow-md lg:mx-0 lg:rounded-xl lg:overflow-hidden">
        <button
          type="button"
          onClick={clearCart}
          disabled={cart.length === 0}
          className="flex-1 bg-brand-dark py-3.5 text-center text-sm font-bold uppercase tracking-wide text-white transition hover:bg-brand-dark/90 disabled:opacity-40"
        >
          Clear
        </button>
        <button
          type="button"
          onClick={submitSale}
          disabled={cart.length === 0 || isSubmitting}
          className="flex flex-[1.4] flex-col items-center justify-center bg-primary px-2 py-2 text-center text-white transition hover:bg-brand-dark disabled:opacity-40"
        >
          {isSubmitting ? (
            <Loader2 className="h-6 w-6 animate-spin" />
          ) : (
            <>
              <span className="text-xs font-semibold uppercase opacity-90">Charge</span>
              <span className="text-base font-bold leading-tight sm:text-lg">
                {formatFcfa(total)}
              </span>
            </>
          )}
        </button>
      </div>

      <div className="grid flex-1 gap-4 lg:grid-cols-[1fr_min(400px,38%)] lg:items-start">
        {/* Product picker — no inner max-height: page scroll continues into sale slip below */}
        <div className="flex flex-col rounded-xl border border-border bg-card shadow-sm">
          <div className="flex flex-col gap-2 border-b border-border bg-card/90 p-3 backdrop-blur-sm sm:flex-row sm:items-center">
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <Select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="h-10 min-w-[8rem] flex-1 text-sm font-medium sm:max-w-[200px]"
              >
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c === 'all' ? 'All items' : c}
                  </option>
                ))}
              </Select>
            </div>
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search products…"
                className="h-10 pl-10"
              />
            </div>
          </div>

          <div>
            {filteredProducts.length === 0 ? (
              <p className="p-8 text-center text-sm text-muted-foreground">
                No products match your filters.
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {filteredProducts.map((p) => {
                  const sellable = sellableUnitsFor(p);
                  return (
                    <li key={p.id} className="px-3 py-3">
                      <div className="flex items-start gap-3">
                        <ProductAvatar name={p.name} imageUrl={p.imageUrl} size="lg" />
                        <div className="min-w-0 flex-1">
                          <p className="font-medium leading-snug text-foreground">{p.name}</p>
                          <div className="mt-1.5 flex flex-wrap gap-1.5">
                            {sellable.length === 0 ? (
                              <span className="text-xs text-muted-foreground">No price set</span>
                            ) : (
                              sellable.map(({ unit, price }) => (
                                <button
                                  key={unit.id}
                                  type="button"
                                  onClick={() => addUnitToCart(p, unit, price)}
                                  className="rounded-lg border border-primary/30 bg-primary/5 px-2.5 py-1 text-xs font-semibold text-primary transition hover:bg-primary hover:text-white active:scale-95"
                                  title={`Add 1 ${unit.name}`}
                                >
                                  <span className="capitalize">{unit.name}</span>
                                  <span className="mx-1 opacity-50">·</span>
                                  <span className="tabular-nums">{formatFcfa(price)}</span>
                                </button>
                              ))
                            )}
                          </div>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        {/* Sale slip */}
        <Card className="shadow-md lg:sticky lg:top-20">
          <CardHeader className="border-b border-border bg-primary/5 pb-3 dark:bg-primary/10">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <ShoppingCart className="h-5 w-5 text-primary" />
              Sale slip
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            {cart.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Tap products on the left to build this sale.
              </p>
            ) : (
              <ul className="space-y-3">
                {cart.map((item) => (
                  <li
                    key={`${item.productId}-${item.unitId}`}
                    className="flex gap-3 rounded-lg border border-border bg-card p-2 shadow-sm"
                  >
                    <ProductAvatar name={item.productName} imageUrl={item.imageUrl} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium leading-tight">{item.productName}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatFcfa(item.unitSellingPrice)} · {item.unitName}
                      </p>
                      <div className="mt-2 flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-8 w-8 shrink-0 rounded-full"
                          onClick={() =>
                            setLineQty(item.productId, item.unitId, item.quantity - 1)
                          }
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <span className="min-w-[2rem] text-center text-sm font-semibold tabular-nums">
                          {item.quantity}
                        </span>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-8 w-8 shrink-0 rounded-full"
                          onClick={() =>
                            setLineQty(item.productId, item.unitId, item.quantity + 1)
                          }
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                        <span className="ml-auto text-sm font-bold text-primary">
                          {formatFcfa(item.quantity * item.unitSellingPrice)}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeFromCart(item.productId, item.unitId)}
                          className="rounded p-1.5 text-destructive hover:bg-destructive/10"
                          title="Remove line"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            {cart.length > 0 && (
              <>
                <div className="flex items-center justify-between border-t border-border pt-3 text-lg font-bold">
                  <span>Total</span>
                  <span className="text-primary">{formatFcfa(total)}</span>
                </div>
                <div className="space-y-2">
                  <Label>Note (optional)</Label>
                  <Input
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Table, customer…"
                  />
                </div>
                <SalePaymentFields
                  total={total}
                  paymentStatus={paymentStatus}
                  onPaymentStatusChange={setPaymentStatus}
                  partialAmountPaid={partialAmountPaid}
                  onPartialAmountPaidChange={setPartialAmountPaid}
                />
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Today&apos;s sales */}
      <Card className="mt-2">
        <CardHeader className="space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-base">
              {isSalesOnly ? 'Your sales today' : "Today's sales"}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Label htmlFor="sales-list-payment" className="text-xs whitespace-nowrap">
                Payment
              </Label>
              <Select
                id="sales-list-payment"
                value={listPaymentFilter}
                onChange={(e) => setListPaymentFilter(e.target.value as SalesPaymentReportFilter)}
                className="min-w-[10rem] text-sm"
              >
                <option value="all">All</option>
                <option value="paid">Paid only</option>
                <option value="outstanding">Unpaid / partial</option>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {todaySales.length === 0 ? (
            <p className="text-sm text-muted-foreground">No sales recorded today.</p>
          ) : filteredTodaySales.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No sales match this filter ({todaySales.length} today).
            </p>
          ) : (
            <div className="space-y-3">
              {filteredTodaySales.slice(0, 10).map((sale) => (
                <div key={sale.id} className="rounded-lg border">
                  <div
                    className="flex cursor-pointer flex-wrap items-center justify-between gap-2 p-2 text-sm hover:bg-muted/50"
                    onClick={() => setExpandedSaleId(expandedSaleId === sale.id ? null : sale.id)}
                  >
                    <div className="min-w-0 flex-1">
                      <span className="text-muted-foreground">
                        {new Date(sale.soldAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      <span className="ml-2">
                        {sale.items?.length ?? 0} item{(sale.items?.length ?? 0) !== 1 ? 's' : ''}
                        {sale.notes && (
                          <span className="ml-1 text-muted-foreground">— {sale.notes}</span>
                        )}
                      </span>
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center justify-end gap-1">
                      {(sale.paymentStatus === 'UNPAID' || sale.paymentStatus === 'PARTIAL') && (
                        <Badge
                          variant="outline"
                          className={
                            sale.paymentStatus === 'UNPAID'
                              ? 'border-amber-600 bg-amber-50 text-amber-900'
                              : 'border-blue-600 bg-blue-50 text-blue-900'
                          }
                        >
                          {sale.paymentStatus === 'UNPAID'
                            ? 'Unpaid'
                            : `Partial · ${(
                                parseFloat(sale.totalAmount || '0') -
                                parseFloat(sale.amountPaid || '0')
                              ).toLocaleString()} FCFA due`}
                        </Badge>
                      )}
                      <Badge variant="outline">
                        {parseFloat(sale.totalAmount || '0').toLocaleString('fr-FR')} FCFA
                      </Badge>
                    </div>
                    <span className="text-muted-foreground">
                      {expandedSaleId === sale.id ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </span>
                    {!sale.id.startsWith('offline-') &&
                    (sale.paymentStatus === 'UNPAID' || sale.paymentStatus === 'PARTIAL') ? (
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          if (!confirm('Mark this sale as paid in full?')) return;
                          try {
                            await patchPayment.mutateAsync({
                              id: sale.id,
                              data: { paymentStatus: 'PAID' },
                            });
                            toast('Marked as paid', 'success');
                          } catch (err) {
                            reportMutationError(err, 'Failed to update payment');
                          }
                        }}
                        className="shrink-0 rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                        title="Mark paid in full"
                        disabled={patchPayment.isPending}
                      >
                        <CircleDollarSign className="h-4 w-4" />
                      </button>
                    ) : null}
                    {!sale.id.startsWith('offline-') ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditSale(sale);
                        }}
                        className="shrink-0 rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                        title="Edit sale"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                    ) : (
                      <span className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium text-amber-800 bg-amber-100">
                        Pending sync
                      </span>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setReceiptSale(sale);
                        setShowReceipt(true);
                      }}
                      className="shrink-0 rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                      title="View receipt"
                    >
                      <Receipt className="h-4 w-4" />
                    </button>
                  </div>
                  {expandedSaleId === sale.id && sale.items && sale.items.length > 0 && (
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
                          {sale.items.map((item) => (
                            <tr key={item.id}>
                              <td className="py-0.5 pr-2">{item.product?.name ?? item.productId}</td>
                              <td className="py-0.5 pr-2 text-right">{item.quantity}</td>
                              <td className="py-0.5 pr-2 text-right">
                                {formatUnitLabel(item.unitNameSnapshot ?? 'UNIT', item.quantity !== 1)}
                              </td>
                              <td className="py-0.5 pr-2 text-right">
                                {parseFloat(item.unitSellingPrice || '0').toLocaleString('fr-FR')} FCFA
                              </td>
                              <td className="py-0.5 text-right font-medium">
                                {parseFloat(item.subtotal || '0').toLocaleString('fr-FR')} FCFA
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <ReceiptDialog
        open={showReceipt}
        sale={receiptSale}
        onClose={() => {
          setShowReceipt(false);
          setReceiptSale(null);
        }}
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
