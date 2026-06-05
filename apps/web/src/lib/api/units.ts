import { api } from './client';

export interface Unit {
  id: string;
  name: string;
  conversionValue: number;
  createdAt: string;
  updatedAt: string;
}

export function getUnits() {
  return api.get<Unit[]>('/units');
}

export function createUnit(data: { name: string; conversionValue: number }) {
  return api.post<Unit>('/units', data);
}

export function updateUnit(id: string, data: { name?: string; conversionValue?: number }) {
  return api.patch<Unit>(`/units/${id}`, data);
}

export function deleteUnit(id: string) {
  return api.delete<Unit>(`/units/${id}`);
}
