'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSuppliers, createSupplier } from '@/lib/api/suppliers';

export function useSuppliers() {
  return useQuery({
    queryKey: ['suppliers'],
    queryFn: getSuppliers,
  });
}

export function useCreateSupplier() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createSupplier,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
    },
  });
}
