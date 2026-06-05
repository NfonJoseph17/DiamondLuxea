'use client';

import { useQuery } from '@tanstack/react-query';
import { getBalances } from '@/lib/api/inventory';

export function useBalances() {
  return useQuery({
    queryKey: ['balances'],
    queryFn: getBalances,
  });
}
