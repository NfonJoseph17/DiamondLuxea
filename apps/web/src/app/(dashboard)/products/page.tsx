'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/lib/auth/auth-context';
import { useProducts, useDeleteProduct, useUpdateProduct } from '@/lib/hooks/use-products';
import { AddProductDialog } from '@/components/products/add-product-dialog';
import { EditProductDialog } from '@/components/products/edit-product-dialog';
import { toast } from '@/components/ui/toaster';
import { ApiError } from '@/lib/api/client';
import { Loader2, Plus, Search, Package, Pencil, Trash2, RotateCcw } from 'lucide-react';
import type { Product } from '@/types';

export default function ProductsPage() {
  const { user } = useAuth();
  const { data: products, isLoading, error, refetch: refetchProducts } = useProducts();
  const deleteProduct = useDeleteProduct();
  const updateProduct = useUpdateProduct();
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [editProductId, setEditProductId] = useState<string | null>(null);
  const editProduct = editProductId ? products?.find((p) => p.id === editProductId) ?? null : null;
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [restoringId, setRestoringId] = useState<string | null>(null);

  async function handleDelete(p: Product) {
    if (!confirm(`Deactivate "${p.name}"? It will no longer appear in sales.`)) return;
    setDeletingId(p.id);
    try {
      await deleteProduct.mutateAsync({ id: p.id });
      toast('Product deactivated', 'success');
    } catch (err) {
      if (err instanceof ApiError) {
        toast(err.message, 'error');
      } else {
        toast('Failed to deactivate product', 'error');
      }
    } finally {
      setDeletingId(null);
    }
  }

  async function handleRestore(p: Product) {
    setRestoringId(p.id);
    try {
      await updateProduct.mutateAsync({ id: p.id, data: { isActive: true } });
      toast('Product restored', 'success');
    } catch (err) {
      if (err instanceof ApiError) {
        toast(err.message, 'error');
      } else {
        toast('Failed to restore product', 'error');
      }
    } finally {
      setRestoringId(null);
    }
  }

  const canManage = user?.role === 'MANAGER' || user?.role === 'CASHIER';

  const filtered = useMemo(() => {
    if (!products) return [];
    if (!search.trim()) return products;
    const q = search.toLowerCase();
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        p.sku?.toLowerCase().includes(q)
    );
  }, [products, search]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Products</h2>
          <p className="text-muted-foreground">View and add drinks and products you sell</p>
        </div>
        {canManage && (
          <Button onClick={() => setShowAdd(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Product
          </Button>
        )}
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search products..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <Card>
          <CardContent className="py-8 text-center space-y-2">
            <p className="text-sm text-destructive font-medium">Failed to load products</p>
            <p className="text-xs text-muted-foreground">
              {error instanceof Error ? error.message : 'Please try again.'}
            </p>
            <p className="text-xs text-muted-foreground">
              If this persists, ensure the database is migrated and seeded (see README).
            </p>
          </CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12">
            <Package className="h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {search ? 'No products match your search.' : 'No products yet. Add your first product to get started.'}
            </p>
            {canManage && !search && (
              <Button size="sm" onClick={() => setShowAdd(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Product
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {filtered.length} product{filtered.length !== 1 ? 's' : ''}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-3 pr-4 font-medium">Name</th>
                    <th className="pb-3 pr-4 font-medium">Category</th>
                    <th className="pb-3 pr-4 font-medium">Unit</th>
                    <th className="pb-3 pr-4 font-medium">Low Stock Level</th>
                    <th className="pb-3 pr-4 font-medium">Status</th>
                    <th className="pb-3 pr-4 font-medium">Created</th>
                    {canManage && <th className="pb-3 font-medium text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((product) => (
                    <tr key={product.id} className="border-b last:border-0">
                      <td className="py-3 pr-4">
                        <div>
                          <span className="font-medium">{product.name}</span>
                          {product.sku && (
                            <span className="ml-2 text-xs text-muted-foreground">{product.sku}</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 pr-4">{product.category}</td>
                      <td className="py-3 pr-4">
                        <Badge variant="outline">
                          {product.baseUnit?.name ?? product.unitType ?? '—'}
                        </Badge>
                      </td>
                      <td className="py-3 pr-4">{product.lowStockLevel}</td>
                      <td className="py-3 pr-4">
                        <Badge variant={product.isActive ? 'success' : 'secondary'}>
                          {product.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </td>
                      <td className="py-3 text-muted-foreground">
                        {new Date(product.createdAt).toLocaleDateString()}
                      </td>
                      {canManage && (
                        <td className="py-3 text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => {
                                setEditProductId(product.id);
                                refetchProducts();
                              }}
                              title="Edit product"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            {product.isActive ? (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={() => handleDelete(product)}
                                disabled={deletingId === product.id}
                                title="Deactivate product"
                              >
                                {deletingId === product.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Trash2 className="h-4 w-4" />
                                )}
                              </Button>
                            ) : (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleRestore(product)}
                                disabled={restoringId === product.id}
                                title="Restore product"
                              >
                                {restoringId === product.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <RotateCcw className="h-4 w-4" />
                                )}
                              </Button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {canManage && (
        <>
          <AddProductDialog open={showAdd} onClose={() => setShowAdd(false)} />
          <EditProductDialog
            open={!!editProductId}
            product={editProduct}
            onClose={() => setEditProductId(null)}
          />
        </>
      )}
    </div>
  );
}
