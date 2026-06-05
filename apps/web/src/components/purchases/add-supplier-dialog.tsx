'use client';

import { useState } from 'react';
import { Dialog, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useCreateSupplier } from '@/lib/hooks/use-suppliers';
import { toast } from '@/components/ui/toaster';
import { ApiError } from '@/lib/api/client';
import { Loader2 } from 'lucide-react';

interface AddSupplierDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated: (supplier: { id: string; name: string }) => void;
}

export function AddSupplierDialog({ open, onClose, onCreated }: AddSupplierDialogProps) {
  const createSupplier = useCreateSupplier();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      toast('Supplier name is required', 'error');
      return;
    }
    try {
      const supplier = await createSupplier.mutateAsync({
        name: name.trim(),
        phone: phone.trim() || undefined,
        address: address.trim() || undefined,
      });
      toast('Supplier added', 'success');
      setName('');
      setPhone('');
      setAddress('');
      onCreated(supplier);
    } catch (err) {
      if (err instanceof ApiError) {
        toast(err.message, 'error');
      } else {
        toast('Failed to add supplier', 'error');
      }
    }
  }

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogHeader>
        <DialogTitle>Add Supplier</DialogTitle>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Name *</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Guinness Cameroun"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Phone</Label>
          <Input
            id="phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Optional"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="address">Address</Label>
          <Input
            id="address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Optional"
          />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={createSupplier.isPending}>
            {createSupplier.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Adding...
              </>
            ) : (
              'Add Supplier'
            )}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
