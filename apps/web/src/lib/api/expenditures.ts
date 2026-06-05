import { api } from './client';
import type { Expenditure } from '@/types';

export type ExpenditureQuery = {
  from?: string;
  to?: string;
  tzOffset?: number;
};

function buildQuery(q: ExpenditureQuery): string {
  const parts: string[] = [];
  if (q.from) parts.push(`from=${encodeURIComponent(q.from)}`);
  if (q.to) parts.push(`to=${encodeURIComponent(q.to)}`);
  if (q.tzOffset != null) parts.push(`tzOffset=${encodeURIComponent(String(q.tzOffset))}`);
  return parts.length ? `?${parts.join('&')}` : '';
}

export function getExpenditures(params?: ExpenditureQuery) {
  return api.get<Expenditure[]>(`/expenditures${buildQuery(params ?? {})}`);
}

export function createExpenditure(data: {
  amount: number;
  spentAt?: string;
  category?: string;
  description: string;
  notes?: string;
}) {
  return api.post<Expenditure>('/expenditures', data);
}

export function deleteExpenditure(id: string) {
  return api.delete<{ ok: boolean }>(`/expenditures/${id}`);
}
