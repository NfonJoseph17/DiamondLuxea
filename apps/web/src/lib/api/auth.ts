import { api } from './client';
import type { AuthResponse, User } from '@/types';

export function login(email: string, password: string) {
  return api.post<AuthResponse>('/auth/login', { email, password });
}

export function getMe() {
  return api.get<User>('/auth/me');
}

export function register(data: {
  fullName: string;
  email: string;
  password: string;
  role?: 'MANAGER' | 'CASHIER' | 'SALES';
}) {
  return api.post<User>('/auth/register', data);
}
