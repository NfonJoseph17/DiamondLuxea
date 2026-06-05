'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  updateProductPrice,
  uploadProductImage,
  clearProductImage,
} from '@/lib/api/products';
import type { UpdateProductPayload } from '@/lib/api/products';

export function useProducts() {
  return useQuery({
    queryKey: ['products'],
    queryFn: () => getProducts(),
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['balances'] });
    },
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateProductPayload }) =>
      updateProduct(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['balances'] });
    },
  });
}

export function useUpdateProductPrice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { purchasePrice: number; retailPrice: number; wholesalePrice: number } }) =>
      updateProductPrice(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['balances'] });
    },
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string }) => deleteProduct(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['balances'] });
    },
  });
}

export function useUploadProductImage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, file }: { id: string; file: File }) => uploadProductImage(id, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

export function useClearProductImage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => clearProductImage(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}
