import { z } from 'zod';

export const registerSchema = z.object({
  fullName: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['MANAGER', 'CASHIER', 'SALES']),
});

export type RegisterFormData = z.infer<typeof registerSchema>;

export const updateUserSchema = z.object({
  fullName: z.string().min(2, 'Name must be at least 2 characters'),
  role: z.enum(['MANAGER', 'CASHIER', 'SALES']),
  isActive: z.boolean(),
  password: z.string().optional(),
}).refine(
  (data) => !data.password || data.password.length >= 6,
  { message: 'Password must be at least 6 characters', path: ['password'] }
);

export type UpdateUserFormData = z.infer<typeof updateUserSchema>;
