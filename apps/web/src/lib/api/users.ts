import { api } from './client';
import type { User } from '@/types';

export function getUsers() {
  return api.get<User[]>('/users');
}

export type UpdateUserPayload = {
  fullName?: string;
  role?: 'MANAGER' | 'CASHIER' | 'SALES';
  isActive?: boolean;
  password?: string;
};

export function updateUser(id: string, data: UpdateUserPayload) {
  return api.patch<User>(`/users/${id}`, data);
}

export function deleteUser(id: string) {
  return api.delete<{ deleted: boolean }>(`/users/${id}`);
}
