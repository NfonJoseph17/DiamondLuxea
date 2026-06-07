import { api } from './client';
import type { PaymentStatus, Sale } from '@/types';
import type { OfflineSaleLineMeta } from '@/lib/offline/synthetic';

export function getSales() {
  return api.get<Sale[]>(`/sales`);
}

export function getSale(id: string) {
  return api.get<Sale>(`/sales/${id}`);
}

export type SaleItemInput = {
  productId: string;
  quantity: number;
  unitId: string;
  /** Chosen price tier (a unit can have several); validated server-side. */
  unitSellingPrice?: number;
};

export type CreateSaleBody = {
  notes?: string;
  items: SaleItemInput[];
  paymentStatus?: PaymentStatus;
  /** Required when paymentStatus is PARTIAL */
  amountPaid?: number;
  /** Stripped client-side; used for offline receipt */
  _offlineSaleLines?: OfflineSaleLineMeta[];
};

export function createSale(data: CreateSaleBody) {
  return api.post<Sale>('/sales', data);
}

export function updateSale(id: string, data: {
  notes?: string;
  items: SaleItemInput[];
  paymentStatus?: PaymentStatus;
  amountPaid?: number;
}) {
  return api.patch<Sale>(`/sales/${id}`, data);
}

export function patchSalePayment(id: string, data: {
  paymentStatus: PaymentStatus;
  amountPaid?: number;
}) {
  return api.patch<Sale>(`/sales/${id}/payment`, data);
}
