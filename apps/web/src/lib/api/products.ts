import { api, ApiError } from './client';
import { normalizePublicApiBase } from './normalize-api-base';
import type { Product } from '@/types';

const API_ORIGIN = () => normalizePublicApiBase(process.env.NEXT_PUBLIC_API_URL);

function bearerHeaders(): HeadersInit {
  if (typeof window === 'undefined') return {};
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function getProducts(params?: { category?: string; isActive?: boolean }) {
  const query = new URLSearchParams();
  if (params?.category) query.set('category', params.category);
  if (params?.isActive !== undefined) query.set('isActive', String(params.isActive));
  const qs = query.toString();
  return api.get<Product[]>(`/products${qs ? `?${qs}` : ''}`);
}

export function getProduct(id: string) {
  return api.get<Product>(`/products/${id}`);
}

export type UnitPriceInput = { unitId: string; sellingPrice: number; label?: string };

export function createProduct(data: {
  name: string;
  category: string;
  baseUnitId: string;
  sku?: string;
  description?: string;
  lowStockLevel?: number;
  purchasePrice: number;
  retailPrice: number;
  wholesalePrice: number;
  defaultSupplierId?: string;
  unitPrices?: UnitPriceInput[];
}) {
  return api.post<Product>('/products', data);
}

export type UpdateProductPayload = {
  name?: string;
  sku?: string;
  category?: string;
  baseUnitId?: string;
  description?: string;
  lowStockLevel?: number;
  isActive?: boolean;
  defaultSupplierId?: string;
  unitPrices?: UnitPriceInput[];
};

export function updateProductPrice(id: string, data: {
  purchasePrice: number;
  retailPrice: number;
  wholesalePrice: number;
}) {
  return api.patch<Product>(`/products/${id}/price`, data);
}

export function updateProduct(id: string, data: UpdateProductPayload) {
  return api.patch<Product>(`/products/${id}`, data);
}

/** Permanently delete a product (server refuses if it has sales/purchase history). */
export function deleteProduct(id: string) {
  return api.delete<{ id: string; deleted: boolean }>(`/products/${id}`);
}

/** Soft-deactivate a product (kept available for products that can't be deleted). */
export function deactivateProduct(id: string) {
  return api.patch<Product>(`/products/${id}`, { isActive: false });
}

export async function uploadProductImage(productId: string, file: File): Promise<Product> {
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(
    `${API_ORIGIN()}/api/products/${encodeURIComponent(productId)}/image`,
    {
      method: 'POST',
      headers: bearerHeaders(),
      body: form,
    }
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg =
      typeof (data as { message?: unknown }).message === 'string'
        ? (data as { message: string }).message
        : `Upload failed (${res.status})`;
    throw new ApiError(msg, res.status, data);
  }
  return data as Product;
}

export function clearProductImage(productId: string) {
  return api.delete<Product>(`/products/${productId}/image`);
}
