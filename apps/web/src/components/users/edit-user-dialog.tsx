'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Dialog, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { useUpdateUser } from '@/lib/hooks/use-users';
import { updateUserSchema, type UpdateUserFormData } from '@/lib/validations/user';
import { toast } from '@/components/ui/toaster';
import { reportMutationError } from '@/lib/utils/mutation-feedback';
import { Loader2 } from 'lucide-react';
import type { User } from '@/types';

interface EditUserDialogProps {
  open: boolean;
  user: User | null;
  onClose: () => void;
}

const ROLES = [
  { value: 'CASHIER', label: 'Cashier' },
  { value: 'SALES', label: 'Sales' },
  { value: 'MANAGER', label: 'Manager' },
] as const;

export function EditUserDialog({ open, user, onClose }: EditUserDialogProps) {
  const updateUser = useUpdateUser();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<UpdateUserFormData>({
    resolver: zodResolver(updateUserSchema),
    defaultValues: { fullName: '', role: 'CASHIER', isActive: true, password: '' },
  });

  const isActive = watch('isActive');

  useEffect(() => {
    if (user) {
      reset({
        fullName: user.fullName,
        role: user.role,
        isActive: user.isActive,
        password: '',
      });
    }
  }, [user, reset, open]);

  async function onSubmit(data: UpdateUserFormData) {
    if (!user) return;
    try {
      await updateUser.mutateAsync({
        id: user.id,
        data: {
          fullName: data.fullName,
          role: data.role,
          isActive: data.isActive,
          ...(data.password?.trim() ? { password: data.password } : {}),
        },
      });
      toast('User updated successfully', 'success');
      onClose();
    } catch (err) {
      reportMutationError(err, 'Failed to update user');
    }
  }

  if (!user) return null;

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogHeader>
        <DialogTitle>Edit User</DialogTitle>
      </DialogHeader>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="edit-fullName">Full Name *</Label>
          <Input id="edit-fullName" {...register('fullName')} placeholder="e.g. John Doe" />
          {errors.fullName && (
            <p className="text-sm text-destructive">{errors.fullName.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label>Email</Label>
          <Input value={user.email} disabled className="bg-muted" />
          <p className="text-xs text-muted-foreground">Email cannot be changed</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="edit-role">Role *</Label>
          <Select id="edit-role" {...register('role')}>
            {ROLES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </Select>
          {errors.role && (
            <p className="text-sm text-destructive">{errors.role.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="edit-password">New password (leave blank to keep current)</Label>
          <Input
            id="edit-password"
            type="password"
            {...register('password')}
            placeholder="Min 6 characters"
          />
          {errors.password && (
            <p className="text-sm text-destructive">{errors.password.message}</p>
          )}
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
            Active (user can log in)
          </Label>
        </div>
        {errors.isActive && (
          <p className="text-sm text-destructive">{errors.isActive.message}</p>
        )}
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
    </Dialog>
  );
}
