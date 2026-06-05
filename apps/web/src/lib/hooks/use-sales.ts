'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSales, createSale, updateSale, patchSalePayment } from '@/lib/api/sales';
import { useAuth } from '@/lib/auth/auth-context';
import type { Sale } from '@/types';

/** Per-user cache so SALES (and account switches) never see another user’s list from React Query / persistence. */
function salesQueryKey(userId: string) {
  return ['sales', userId] as const;
}

export function useSales() {
  const { user } = useAuth();
  const userId = user?.id ?? '';

  return useQuery({
    queryKey: salesQueryKey(userId),
    queryFn: () => getSales(),
    enabled: !!userId,
  });
}

export function useCreateSale() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const userId = user?.id ?? '';

  return useMutation({
    mutationFn: createSale,
    onSuccess: (data) => {
      // Coerce id — API must return string, but avoid throwing if shape differs (would reject mutateAsync).
      const saleId = data && typeof data === 'object' && 'id' in data ? String((data as Sale).id) : '';
      if (saleId.startsWith('offline-')) {
        if (userId) {
          queryClient.setQueryData<Sale[]>(salesQueryKey(userId), (old) =>
            old ? [data, ...old] : [data]
          );
        }
      } else {
        queryClient.invalidateQueries({ queryKey: ['sales'] });
      }
      queryClient.invalidateQueries({ queryKey: ['balances'] });
      queryClient.invalidateQueries({ queryKey: ['reports'] });
    },
  });
}

export function useUpdateSale() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof updateSale>[1] }) =>
      updateSale(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['balances'] });
      queryClient.invalidateQueries({ queryKey: ['reports'] });
    },
  });
}

export function usePatchSalePayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof patchSalePayment>[1] }) =>
      patchSalePayment(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['reports'] });
    },
  });
}
