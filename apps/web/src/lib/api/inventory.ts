import { api } from './client';
import type { InventoryBalance } from '@/types';

export function getBalances() {
  return api.get<InventoryBalance[]>('/inventory/balances');
}
