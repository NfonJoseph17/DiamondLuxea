'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getUsers, updateUser, deleteUser } from '@/lib/api/users';
import { register } from '@/lib/api/auth';
import type { RegisterFormData } from '@/lib/validations/user';
import type { UpdateUserPayload } from '@/lib/api/users';

export function useUsers() {
  return useQuery({
    queryKey: ['users'],
    queryFn: () => getUsers(),
  });
}

export function useRegister() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: RegisterFormData) =>
      register({
        fullName: data.fullName,
        email: data.email,
        password: data.password,
        role: data.role,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateUserPayload }) =>
      updateUser(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string }) => deleteUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}
