import { api } from './client';
import type { Purchase } from '@/types';
import type { OfflinePurchaseLineMeta } from '@/lib/offline/synthetic';

export function getPurchases() {
  return api.get<Purchase[]>(`/purchases`);
}

export function getPurchase(id: string) {
  return api.get<Purchase>(`/purchases/${id}`);
}

export function getLastPriceForSupplier(supplierId: string, productId: string) {
  const params = new URLSearchParams({ supplierId, productId });
  return api.get<{
    unitPurchasePrice: number;
    unitSellingPriceSnapshot: number;
  } | null>(`/purchases/last-price?${params}`);
}

export type CreatePurchaseBody = {
  supplierId?: string;
  notes?: string;
  items: { productId: string; quantity: number; unitId: string }[];
  _offlinePurchaseLines?: OfflinePurchaseLineMeta[];
  _offlineSupplierName?: string | null;
};

export function createPurchase(data: CreatePurchaseBody) {
  return api.post<Purchase>('/purchases', data);
}

export function updatePurchase(id: string, data: {
  supplierId?: string;
  notes?: string;
  items: { productId: string; quantity: number; unitId: string }[];
}) {
  return api.patch<Purchase>(`/purchases/${id}`, data);
}
