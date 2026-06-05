'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getExpenditures,
  createExpenditure,
  deleteExpenditure,
  type ExpenditureQuery,
} from '@/lib/api/expenditures';

export function useExpenditures(params?: ExpenditureQuery) {
  return useQuery({
    queryKey: ['expenditures', params?.from, params?.to, params?.tzOffset],
    queryFn: () => getExpenditures(params),
  });
}

export function useCreateExpenditure() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createExpenditure,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expenditures'] });
      qc.invalidateQueries({ queryKey: ['reports'] });
    },
  });
}

export function useDeleteExpenditure() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteExpenditure,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expenditures'] });
      qc.invalidateQueries({ queryKey: ['reports'] });
    },
  });
}
