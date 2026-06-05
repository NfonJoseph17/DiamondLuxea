import { z } from 'zod';

export const createProductSchema = z.object({
  name: z.string().min(1, 'Product name is required'),
  category: z.string().min(1, 'Category is required'),
  baseUnitId: z.string().min(1, 'Base unit is required'),
  sku: z.string().optional(),
  description: z.string().optional(),
  lowStockLevel: z.coerce.number().int().min(0).default(10),
  purchasePrice: z.coerce.number().min(0, 'Purchase price must be >= 0'),
  retailPrice: z.coerce.number().min(0, 'Retail price must be >= 0'),
  wholesalePrice: z.coerce.number().min(0, 'Wholesale price must be >= 0'),
  defaultSupplierId: z.string().optional(),
});

export type CreateProductFormData = z.infer<typeof createProductSchema>;

export const updateProductSchema = z.object({
  name: z.string().min(1, 'Product name is required'),
  category: z.string().min(1, 'Category is required'),
  baseUnitId: z.string().min(1, 'Base unit is required'),
  sku: z.string().optional(),
  description: z.string().optional(),
  lowStockLevel: z.coerce.number().int().min(0).default(10),
  isActive: z.boolean(),
  defaultSupplierId: z.string().optional(),
});

export type UpdateProductFormData = z.infer<typeof updateProductSchema>;

export const updatePriceSchema = z.object({
  purchasePrice: z.coerce.number().min(0, 'Purchase price must be >= 0'),
  retailPrice: z.coerce.number().min(0, 'Retail price must be >= 0'),
  wholesalePrice: z.coerce.number().min(0, 'Wholesale price must be >= 0'),
});

export type UpdatePriceFormData = z.infer<typeof updatePriceSchema>;
