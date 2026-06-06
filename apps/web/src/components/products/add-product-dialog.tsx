'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Dialog, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { useCreateProduct, useUploadProductImage } from '@/lib/hooks/use-products';
import { useSuppliers } from '@/lib/hooks/use-suppliers';
import { useUnits } from '@/lib/hooks/use-units';
import { createProductSchema, type CreateProductFormData } from '@/lib/validations/product';
import { toast } from '@/components/ui/toaster';
import { reportMutationError } from '@/lib/utils/mutation-feedback';
import { Loader2 } from 'lucide-react';
import { AddSupplierDialog } from '@/components/purchases/add-supplier-dialog';
import { useState } from 'react';

interface AddProductDialogProps {
  open: boolean;
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

export function AddProductDialog({ open, onClose }: AddProductDialogProps) {
  const createProduct = useCreateProduct();
  const uploadImage = useUploadProductImage();
  const { data: suppliers } = useSuppliers();
  const { data: units } = useUnits();
  const [showAddSupplier, setShowAddSupplier] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CreateProductFormData>({
    resolver: zodResolver(createProductSchema),
    defaultValues: { lowStockLevel: 10 },
  });

  async function onSubmit(data: CreateProductFormData) {
    try {
      const created = await createProduct.mutateAsync({
        name: data.name,
        category: data.category,
        baseUnitId: data.baseUnitId,
        sku: data.sku || undefined,
        description: data.description || undefined,
        lowStockLevel: data.lowStockLevel,
        purchasePrice: data.purchasePrice,
        retailPrice: data.retailPrice,
        wholesalePrice: data.wholesalePrice,
        defaultSupplierId: data.defaultSupplierId || undefined,
      });
      if (imageFile && created?.id) {
        try {
          await uploadImage.mutateAsync({ id: created.id, file: imageFile });
        } catch (e) {
          reportMutationError(e, 'Product saved but image upload failed');
        }
      }
      toast('Product created successfully', 'success');
      reset();
      setImageFile(null);
      setImagePreview(null);
      onClose();
    } catch (err) {
      reportMutationError(err, 'Failed to create product');
    }
  }

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogHeader>
        <DialogTitle>Add New Product</DialogTitle>
      </DialogHeader>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="name">Product Name *</Label>
            <Input id="name" {...register('name')} placeholder="e.g. Castel Beer 65cl" />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="sku">SKU</Label>
            <Input id="sku" {...register('sku')} placeholder="Optional" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="category">Category *</Label>
            <Select id="category" {...register('category')}>
              <option value="">Select category</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </Select>
            {errors.category && <p className="text-sm text-destructive">{errors.category.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="baseUnitId">Base Unit *</Label>
            <Select id="baseUnitId" {...register('baseUnitId')}>
              <option value="">Select base unit</option>
              {units?.map((u) => (
                <option key={u.id} value={u.id}>{u.name} (conversion: {u.conversionValue})</option>
              ))}
            </Select>
            {errors.baseUnitId && <p className="text-sm text-destructive">{errors.baseUnitId.message}</p>}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Input id="description" {...register('description')} placeholder="Optional description" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="product-image">Product photo</Label>
          <Input
            id="product-image"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="cursor-pointer"
            onChange={(e) => {
              const f = e.target.files?.[0];
              setImageFile(f ?? null);
              if (imagePreview) URL.revokeObjectURL(imagePreview);
              setImagePreview(f ? URL.createObjectURL(f) : null);
            }}
          />
          <p className="text-xs text-muted-foreground">Optional. Shown on the sales screen (max ~3MB).</p>
          {imagePreview && (
            <img
              src={imagePreview}
              alt="Preview"
              className="h-24 w-24 rounded-full object-cover border shadow-sm"
            />
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="lowStockLevel">Low Stock Alert Level</Label>
          <Input id="lowStockLevel" type="number" {...register('lowStockLevel')} />
        </div>

        <div className="space-y-2">
          <Label>Default Supplier</Label>
          <div className="flex gap-2">
            <Select id="defaultSupplierId" {...register('defaultSupplierId')} className="flex-1">
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

        <div className="border-t pt-4">
          <p className="mb-3 text-sm font-medium">Pricing (XAF per base unit)</p>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="purchasePrice">Purchase Price</Label>
              <Input id="purchasePrice" type="number" step="1" {...register('purchasePrice')} placeholder="0" />
              {errors.purchasePrice && <p className="text-sm text-destructive">{errors.purchasePrice.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="retailPrice">Retail Price</Label>
              <Input id="retailPrice" type="number" step="1" {...register('retailPrice')} placeholder="0" />
              {errors.retailPrice && <p className="text-sm text-destructive">{errors.retailPrice.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="wholesalePrice">Wholesale Price</Label>
              <Input id="wholesalePrice" type="number" step="1" {...register('wholesalePrice')} placeholder="0" />
              {errors.wholesalePrice && <p className="text-sm text-destructive">{errors.wholesalePrice.message}</p>}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting || uploadImage.isPending}>
            {isSubmitting || uploadImage.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {uploadImage.isPending ? 'Uploading image…' : 'Creating...'}
              </>
            ) : (
              'Create Product'
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
