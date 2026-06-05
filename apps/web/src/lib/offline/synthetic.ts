import type { PaymentStatus, Purchase, Sale, SaleItem, StockAdjustment, User } from '@/types';

export type OfflineSaleLineMeta = {
  productId: string;
  productName: string;
  quantity: number;
  unitId: string;
  unitName: string;
  unitSellingPrice: number;
  unitPurchasePrice: number;
  unitConversionValue?: number;
};

export type OfflinePurchaseLineMeta = {
  productId: string;
  productName: string;
  quantity: number;
  unitId: string;
  unitName: string;
  unitPurchasePrice: number;
  unitSellingPriceSnapshot: number;
  unitConversionValue?: number;
};

export type OfflineMeta =
  | { kind: 'sale'; lines: OfflineSaleLineMeta[] }
  | { kind: 'purchase'; lines: OfflinePurchaseLineMeta[]; supplierName?: string | null }
  | {
      kind: 'adjustment';
      productName: string;
      unitName?: string | null;
      unitConversionValue?: number | null;
    };

function readUser(): Pick<User, 'id' | 'fullName'> | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('user');
    if (!raw) return null;
    const u = JSON.parse(raw) as User;
    return { id: u.id, fullName: u.fullName };
  } catch {
    return null;
  }
}

export function buildSyntheticSale(
  clientMutationId: string,
  notes: string | undefined,
  meta: OfflineSaleLineMeta[],
  payment?: { paymentStatus: PaymentStatus; amountPaid: number },
): Sale {
  const user = readUser();
  const now = new Date().toISOString();
  const items: SaleItem[] = meta.map((line, i) => {
    const subtotal = line.quantity * line.unitSellingPrice;
    return {
      id: `offline-item-${clientMutationId}-${i}`,
      productId: line.productId,
      quantity: line.quantity,
      unitId: line.unitId,
      unitConversionValueSnapshot: line.unitConversionValue ?? 1,
      unitNameSnapshot: line.unitName,
      unitSellingPrice: String(line.unitSellingPrice),
      unitPurchasePriceSnapshot: String(line.unitPurchasePrice),
      subtotal: String(subtotal),
      product: {
        id: line.productId,
        name: line.productName,
        sku: null,
        category: '',
        unitType: 'UNIT',
        description: null,
        lowStockLevel: 0,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
      unit: {
        id: line.unitId,
        name: line.unitName,
        conversionValue: line.unitConversionValue ?? 1,
        createdAt: now,
        updatedAt: now,
      },
    };
  });
  const total = items.reduce((s, it) => s + parseFloat(it.subtotal), 0);
  let paymentStatus: PaymentStatus = 'PAID';
  let amountPaid = total;
  if (payment) {
    paymentStatus = payment.paymentStatus;
    amountPaid = payment.amountPaid;
  }
  return {
    id: `offline-${clientMutationId}`,
    locationId: 'offline',
    soldAt: now,
    createdById: user?.id ?? 'offline',
    totalAmount: String(total),
    paymentStatus,
    amountPaid: String(amountPaid),
    notes: notes ?? null,
    items,
    createdBy: user ? { id: user.id, fullName: user.fullName } : undefined,
  };
}

export function buildSyntheticPurchase(
  clientMutationId: string,
  notes: string | undefined,
  supplierId: string | undefined,
  meta: OfflinePurchaseLineMeta[],
  supplierName?: string | null
): Purchase {
  const user = readUser();
  const now = new Date().toISOString();
  const items = meta.map((line, i) => {
    const subtotal = line.quantity * line.unitPurchasePrice;
    return {
      id: `offline-pi-${clientMutationId}-${i}`,
      productId: line.productId,
      quantity: line.quantity,
      unitId: line.unitId,
      unitConversionValueSnapshot: line.unitConversionValue ?? 1,
      unitNameSnapshot: line.unitName,
      unitPurchasePrice: String(line.unitPurchasePrice),
      unitSellingPriceSnapshot: String(line.unitSellingPriceSnapshot),
      subtotal: String(subtotal),
      product: {
        id: line.productId,
        name: line.productName,
        sku: null,
        category: '',
        unitType: 'UNIT',
        description: null,
        lowStockLevel: 0,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
      unit: {
        id: line.unitId,
        name: line.unitName,
        conversionValue: line.unitConversionValue ?? 1,
        createdAt: now,
        updatedAt: now,
      },
    };
  });
  const total = items.reduce((s, it) => s + parseFloat(it.subtotal), 0);
  return {
    id: `offline-${clientMutationId}`,
    supplierId: supplierId ?? null,
    purchasedAt: now,
    createdById: user?.id ?? 'offline',
    totalAmount: String(total),
    notes: notes ?? null,
    supplier: supplierName ? { id: supplierId ?? '', name: supplierName, phone: null, address: null, notes: null, createdAt: now, updatedAt: now } : null,
    createdBy: user ? { id: user.id, fullName: user.fullName } : undefined,
    items,
  };
}

export function buildSyntheticAdjustment(
  clientMutationId: string,
  body: {
    productId: string;
    adjustmentType: 'INCREASE' | 'DECREASE';
    reasonType: string;
    quantity: number;
    unitId?: string;
    note?: string;
  },
  meta: { productName: string; unitName?: string | null; unitConversionValue?: number | null }
): StockAdjustment {
  const user = readUser();
  const now = new Date().toISOString();
  const cv = meta.unitConversionValue ?? 1;
  const qtyBase = body.quantity * cv;
  return {
    id: `offline-${clientMutationId}`,
    locationId: 'offline',
    productId: body.productId,
    adjustmentType: body.adjustmentType,
    reasonType: body.reasonType as StockAdjustment['reasonType'],
    quantity: qtyBase,
    unitId: body.unitId ?? null,
    unitConversionValueSnapshot: cv,
    unitNameSnapshot: meta.unitName ?? null,
    note: body.note ?? null,
    adjustedAt: now,
    createdById: user?.id ?? 'offline',
    createdAt: now,
    product: {
      id: body.productId,
      name: meta.productName,
      sku: null,
      category: '',
      unitType: 'UNIT',
      description: null,
      lowStockLevel: 0,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    },
    unit: body.unitId
      ? { id: body.unitId, name: meta.unitName ?? 'unit', conversionValue: cv }
      : null,
    createdBy: user ? { id: user.id, fullName: user.fullName } : undefined,
  };
}
