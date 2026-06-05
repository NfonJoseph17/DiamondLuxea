'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getUnits,
  createUnit,
  updateUnit,
  deleteUnit,
} from '@/lib/api/units';

export function useUnits() {
  return useQuery({
    queryKey: ['units'],
    queryFn: getUnits,
  });
}

export function useCreateUnit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createUnit,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['units'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

export function useUpdateUnit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name?: string; conversionValue?: number } }) =>
      updateUnit(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['units'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

export function useDeleteUnit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteUnit,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['units'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}
