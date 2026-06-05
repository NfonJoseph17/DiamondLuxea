import { api } from './client';
import type { PaymentStatus, Sale } from '@/types';
import type { OfflineSaleLineMeta } from '@/lib/offline/synthetic';

export function getSales() {
  return api.get<Sale[]>(`/sales`);
}

export function getSale(id: string) {
  return api.get<Sale>(`/sales/${id}`);
}

export type CreateSaleBody = {
  notes?: string;
  items: { productId: string; quantity: number; unitId: string }[];
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
  items: { productId: string; quantity: number; unitId: string }[];
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
