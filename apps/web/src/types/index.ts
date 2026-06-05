export type Role = 'MANAGER' | 'CASHIER' | 'SALES';

export interface User {
  id: string;
  fullName: string;
  email: string;
  role: Role;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  accessToken: string;
  user: Pick<User, 'id' | 'fullName' | 'email' | 'role'>;
}

export interface Product {
  id: string;
  name: string;
  sku: string | null;
  category: string;
  unitType: string;
  baseUnitId?: string | null;
  baseUnit?: Unit | null;
  description: string | null;
  /** Relative API path (/api/uploads/...) or external https URL */
  imageUrl?: string | null;
  lowStockLevel: number;
  isActive: boolean;
  defaultSupplierId?: string | null;
  defaultSupplier?: Supplier | null;
  createdAt: string;
  updatedAt: string;
  priceHistory?: ProductPrice[];
  inventoryBalance?: InventoryBalance[];
}

export interface Supplier {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Purchase {
  id: string;
  supplierId: string | null;
  purchasedAt: string;
  createdById: string;
  totalAmount?: string;
  notes: string | null;
  supplier?: Supplier | null;
  createdBy?: { id: string; fullName: string };
  items: PurchaseItem[];
}

export interface PurchaseItem {
  id: string;
  productId: string;
  quantity: number;
  unitId?: string | null;
  unitConversionValueSnapshot?: number | null;
  unitNameSnapshot?: string | null;
  unitPurchasePrice: string;
  unitSellingPriceSnapshot: string;
  subtotal: string;
  product?: Product;
  unit?: Unit | null;
}

export interface ProductPrice {
  id: string;
  productId: string;
  purchasePrice: string;
  retailPrice: string;
  wholesalePrice: string;
  effectiveFrom: string;
  effectiveTo: string | null;
}

export interface Unit {
  id: string;
  name: string;
  conversionValue: number;
  createdAt: string;
  updatedAt: string;
}

export interface InventoryLocation {
  id: string;
  name: string;
  type: string;
  isActive: boolean;
}

export interface InventoryBalance {
  id: string;
  productId: string;
  locationId: string;
  quantity: number;
  product?: Product;
  location?: InventoryLocation;
}

export interface DailySession {
  id: string;
  locationId: string;
  openedById: string;
  closedById: string | null;
  openedAt: string;
  closedAt: string | null;
  status: 'OPEN' | 'CLOSED';
  location?: InventoryLocation;
  openedBy?: { id: string; fullName: string; role?: string };
  closedBy?: { id: string; fullName: string; role?: string } | null;
}

export type PaymentStatus = 'UNPAID' | 'PAID' | 'PARTIAL';

export interface Expenditure {
  id: string;
  amount: string;
  spentAt: string;
  category: string | null;
  description: string;
  notes: string | null;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: { id: string; fullName: string };
}

export interface Sale {
  id: string;
  locationId: string;
  soldAt: string;
  createdById: string;
  totalAmount: string;
  paymentStatus: PaymentStatus;
  amountPaid: string;
  notes: string | null;
  items: SaleItem[];
  location?: InventoryLocation;
  createdBy?: { id: string; fullName: string };
}

export interface SaleItem {
  id: string;
  productId: string;
  quantity: number;
  unitId?: string | null;
  unitConversionValueSnapshot?: number | null;
  unitNameSnapshot?: string | null;
  unitSellingPrice: string;
  unitPurchasePriceSnapshot: string;
  subtotal: string;
  product?: Product;
  unit?: Unit | null;
}

export type AdjustmentType = 'INCREASE' | 'DECREASE';
export type AdjustmentReasonType =
  | 'BREAKAGE'
  | 'LOSS'
  | 'COUNT_CORRECTION'
  | 'DAMAGE'
  | 'OTHER';

export interface StockAdjustment {
  id: string;
  locationId: string;
  productId: string;
  adjustmentType: AdjustmentType;
  reasonType: AdjustmentReasonType;
  quantity: number;
  unitId?: string | null;
  unitConversionValueSnapshot?: number | null;
  unitNameSnapshot?: string | null;
  note: string | null;
  adjustedAt: string;
  createdById: string;
  createdAt: string;
  product?: Product;
  unit?: { id: string; name: string; conversionValue: number } | null;
  location?: InventoryLocation;
  createdBy?: { id: string; fullName: string };
}
