'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAdjustments, createAdjustment } from '@/lib/api/adjustments';
import type { StockAdjustment } from '@/types';

export function useAdjustments() {
  return useQuery({
    queryKey: ['adjustments'],
    queryFn: getAdjustments,
  });
}

export function useCreateAdjustment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createAdjustment,
    onSuccess: (data) => {
      if (data?.id?.startsWith('offline-')) {
        queryClient.setQueryData<StockAdjustment[]>(['adjustments'], (old) =>
          old ? [data, ...old] : [data]
        );
      } else {
        queryClient.invalidateQueries({ queryKey: ['adjustments'] });
      }
      queryClient.invalidateQueries({ queryKey: ['balances'] });
    },
  });
}
