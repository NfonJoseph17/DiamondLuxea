import { api } from './client';
import type { Supplier } from '@/types';

export function getSuppliers() {
  return api.get<Supplier[]>(`/suppliers`);
}

export function getSupplier(id: string) {
  return api.get<Supplier>(`/suppliers/${id}`);
}

export function createSupplier(data: {
  name: string;
  phone?: string;
  address?: string;
  notes?: string;
}) {
  return api.post<Supplier>('/suppliers', data);
}

export function updateSupplier(id: string, data: Partial<{
  name: string;
  phone: string;
  address: string;
  notes: string;
}>) {
  return api.patch<Supplier>(`/suppliers/${id}`, data);
}
