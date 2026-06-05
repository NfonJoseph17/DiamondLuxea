'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Dialog, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import {
  useUpdateProduct,
  useUpdateProductPrice,
  useUploadProductImage,
  useClearProductImage,
} from '@/lib/hooks/use-products';
import { publicProductImageUrl } from '@/lib/utils/product-image';
import { useSuppliers } from '@/lib/hooks/use-suppliers';
import { useUnits } from '@/lib/hooks/use-units';
import { updateProductSchema, updatePriceSchema, type UpdateProductFormData, type UpdatePriceFormData } from '@/lib/validations/product';
import { toast } from '@/components/ui/toaster';
import { ApiError } from '@/lib/api/client';
import { Loader2 } from 'lucide-react';
import { AddSupplierDialog } from '@/components/purchases/add-supplier-dialog';
import { useState } from 'react';
import type { Product } from '@/types';
import { useForm as usePriceForm } from 'react-hook-form';
import { zodResolver as zodResolverPrice } from '@hookform/resolvers/zod';

interface EditProductDialogProps {
  open: boolean;
  product: Product | null;
  onClose: () => void;
}
const CATEGORIES = [
  'Beer',
  'Wine',
  'Spirit',
  'Soft Drink',
  'Water',
  'Juice',
  'Snack',
  'Other',
];

export function EditProductDialog({ open, product, onClose }: EditProductDialogProps) {
  const updateProduct = useUpdateProduct();
  const updateProductPrice = useUpdateProductPrice();
  const uploadProductPhoto = useUploadProductImage();
  const clearProductPhoto = useClearProductImage();
  const { data: suppliers } = useSuppliers();
  const { data: units } = useUnits();
  const [showAddSupplier, setShowAddSupplier] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<UpdateProductFormData>({
    resolver: zodResolver(updateProductSchema),
    defaultValues: { lowStockLevel: 10, isActive: true },
  });

  const currentPrice = product?.priceHistory?.[0];
  const {
    register: registerPrice,
    handleSubmit: handleSubmitPrice,
    reset: resetPrice,
    watch: watchPrice,
    trigger: triggerPrice,
    formState: { errors: priceErrors, isSubmitting: isPriceSubmitting },
  } = usePriceForm<UpdatePriceFormData>({
    resolver: zodResolverPrice(updatePriceSchema),
    defaultValues: {
      purchasePrice: currentPrice ? parseFloat(currentPrice.purchasePrice) : 0,
      retailPrice: currentPrice ? parseFloat(currentPrice.retailPrice) : 0,
      wholesalePrice: currentPrice ? parseFloat(currentPrice.wholesalePrice) : 0,
    },
  });

  const isActive = watch('isActive');

  useEffect(() => {
    if (product) {
      reset({
        name: product.name,
        sku: product.sku ?? '',
        category: product.category,
        baseUnitId: product.baseUnitId ?? '',
        description: product.description ?? '',
        lowStockLevel: product.lowStockLevel ?? 10,
        isActive: product.isActive ?? true,
        defaultSupplierId: product.defaultSupplierId ?? '',
      });
      const ph = product.priceHistory?.[0];
      if (ph) {
        resetPrice({
          purchasePrice: parseFloat(ph.purchasePrice),
          retailPrice: parseFloat(ph.retailPrice),
          wholesalePrice: parseFloat(ph.wholesalePrice),
        });
      }
    }
  }, [product, reset, resetPrice, open]);

  async function onSubmit(data: UpdateProductFormData) {
    if (!product) return;
    const priceValid = await triggerPrice();
    if (!priceValid) return;
    const priceData = watchPrice() as UpdatePriceFormData;
    try {
      await updateProduct.mutateAsync({
        id: product.id,
        data: {
          name: data.name,
          sku: data.sku || undefined,
          category: data.category,
          baseUnitId: data.baseUnitId || undefined,
          description: data.description || undefined,
          lowStockLevel: data.lowStockLevel,
          isActive: data.isActive,
          defaultSupplierId: data.defaultSupplierId || undefined,
        },
      });
      await updateProductPrice.mutateAsync({
        id: product.id,
        data: {
          purchasePrice: priceData.purchasePrice,
          retailPrice: priceData.retailPrice,
          wholesalePrice: priceData.wholesalePrice,
        },
      });
      toast('Product and prices updated successfully', 'success');
      onClose();
    } catch (err) {
      if (err instanceof ApiError) {
        toast(err.message, 'error');
      } else {
        toast('Failed to update product', 'error');
      }
    }
  }

  async function onPriceSubmit(data: UpdatePriceFormData) {
    if (!product) return;
    try {
      await updateProductPrice.mutateAsync({
        id: product.id,
        data: {
          purchasePrice: data.purchasePrice,
          retailPrice: data.retailPrice,
          wholesalePrice: data.wholesalePrice,
        },
      });
      toast('Prices updated successfully', 'success');
    } catch (err) {
      if (err instanceof ApiError) {
        toast(err.message, 'error');
      } else {
        toast('Failed to update prices', 'error');
      }
    }
  }

  if (!product) return null;

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogHeader>
        <DialogTitle>Edit Product</DialogTitle>
      </DialogHeader>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="edit-name">Product Name *</Label>
            <Input id="edit-name" {...register('name')} placeholder="e.g. Castel Beer 65cl" />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-sku">SKU</Label>
            <Input id="edit-sku" {...register('sku')} placeholder="Optional" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-category">Category *</Label>
            <Select id="edit-category" {...register('category')}>
              <option value="">Select category</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </Select>
            {errors.category && (
              <p className="text-sm text-destructive">{errors.category.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-baseUnitId">Base Unit *</Label>
            <Select id="edit-baseUnitId" {...register('baseUnitId')}>
              <option value="">Select base unit</option>
              {units?.map((u) => (
                <option key={u.id} value={u.id}>{u.name} (conversion: {u.conversionValue})</option>
              ))}
            </Select>
            {errors.baseUnitId && (
              <p className="text-sm text-destructive">{errors.baseUnitId.message}</p>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="edit-description">Description</Label>
          <Input id="edit-description" {...register('description')} placeholder="Optional" />
        </div>

        <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
          <Label>Sales screen photo</Label>
          <div className="flex flex-wrap items-center gap-4">
            {publicProductImageUrl(product.imageUrl) ? (
              <img
                src={publicProductImageUrl(product.imageUrl)}
                alt=""
                className="h-24 w-24 rounded-full object-cover border-2 border-background shadow-md"
              />
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-emerald-100 text-2xl font-bold text-emerald-800 border-2 border-dashed border-emerald-300">
                {product.name.slice(0, 1).toUpperCase()}
              </div>
            )}
            <div className="flex flex-col gap-2">
              <Input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="max-w-xs cursor-pointer"
                disabled={uploadProductPhoto.isPending || clearProductPhoto.isPending}
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  e.target.value = '';
                  if (!f || !product) return;
                  try {
                    await uploadProductPhoto.mutateAsync({ id: product.id, file: f });
                    toast('Photo updated', 'success');
                  } catch (err) {
                    if (err instanceof ApiError) toast(err.message, 'error');
                    else toast('Upload failed', 'error');
                  }
                }}
              />
              {product.imageUrl ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-fit"
                  disabled={clearProductPhoto.isPending}
                  onClick={async () => {
                    if (!product || !confirm('Remove this product photo?')) return;
                    try {
                      await clearProductPhoto.mutateAsync(product.id);
                      toast('Photo removed', 'success');
                    } catch (err) {
                      if (err instanceof ApiError) toast(err.message, 'error');
                      else toast('Failed to remove photo', 'error');
                    }
                  }}
                >
                  Remove photo
                </Button>
              ) : null}
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="edit-lowStockLevel">Low Stock Alert Level</Label>
          <Input id="edit-lowStockLevel" type="number" {...register('lowStockLevel')} />
        </div>

        <div className="space-y-2">
          <Label>Default Supplier</Label>
          <div className="flex gap-2">
            <Select id="edit-defaultSupplierId" {...register('defaultSupplierId')} className="flex-1">
              <option value="">None</option>
              {suppliers?.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </Select>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowAddSupplier(true)}
            >
              Add
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="edit-isActive"
            checked={isActive}
            onChange={(e) => setValue('isActive', e.target.checked)}
            className="h-4 w-4 rounded border"
          />
          <Label htmlFor="edit-isActive" className="cursor-pointer font-normal">
            Active (product appears in sales and stock)
          </Label>
        </div>

        <div className="border-t pt-4">
          <p className="mb-3 text-sm font-medium">Pricing (XAF per base unit)</p>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="edit-purchasePrice">Purchase Price</Label>
              <Input id="edit-purchasePrice" type="number" step="1" {...registerPrice('purchasePrice')} />
              {priceErrors.purchasePrice && (
                <p className="text-sm text-destructive">{priceErrors.purchasePrice.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-retailPrice">Retail Price</Label>
              <Input id="edit-retailPrice" type="number" step="1" {...registerPrice('retailPrice')} />
              {priceErrors.retailPrice && (
                <p className="text-sm text-destructive">{priceErrors.retailPrice.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-wholesalePrice">Wholesale Price</Label>
              <Input id="edit-wholesalePrice" type="number" step="1" {...registerPrice('wholesalePrice')} />
              {priceErrors.wholesalePrice && (
                <p className="text-sm text-destructive">{priceErrors.wholesalePrice.message}</p>
              )}
            </div>
            <div className="sm:col-span-3">
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={isPriceSubmitting}
                onClick={handleSubmitPrice(onPriceSubmit)}
              >
                {isPriceSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Update Prices
              </Button>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </div>
      </form>
      <AddSupplierDialog
        open={showAddSupplier}
        onClose={() => setShowAddSupplier(false)}
        onCreated={(s) => {
          setShowAddSupplier(false);
          setValue('defaultSupplierId', s.id);
        }}
      />
    </Dialog>
  );
}
