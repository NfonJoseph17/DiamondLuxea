'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getPurchases, createPurchase, updatePurchase } from '@/lib/api/purchases';
import type { Purchase } from '@/types';

export function usePurchases() {
  return useQuery({
    queryKey: ['purchases'],
    queryFn: getPurchases,
  });
}

export function useCreatePurchase() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createPurchase,
    onSuccess: (data) => {
      if (data?.id?.startsWith('offline-')) {
        queryClient.setQueryData<Purchase[]>(['purchases'], (old) =>
          old ? [data, ...old] : [data]
        );
      } else {
        queryClient.invalidateQueries({ queryKey: ['purchases'] });
      }
      queryClient.invalidateQueries({ queryKey: ['balances'] });
    },
  });
}

export function useUpdatePurchase() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof updatePurchase>[1] }) =>
      updatePurchase(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchases'] });
      queryClient.invalidateQueries({ queryKey: ['balances'] });
    },
  });
}
