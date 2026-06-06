'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Dialog, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { useRegister } from '@/lib/hooks/use-users';
import { registerSchema, type RegisterFormData } from '@/lib/validations/user';
import { toast } from '@/components/ui/toaster';
import { reportMutationError } from '@/lib/utils/mutation-feedback';
import { Loader2 } from 'lucide-react';

interface AddUserDialogProps {
  open: boolean;
  onClose: () => void;
}

const ROLES = [
  { value: 'CASHIER', label: 'Cashier' },
  { value: 'SALES', label: 'Sales' },
  { value: 'MANAGER', label: 'Manager' },
] as const;

export function AddUserDialog({ open, onClose }: AddUserDialogProps) {
  const registerUser = useRegister();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: { role: 'CASHIER' },
  });

  async function onSubmit(data: RegisterFormData) {
    try {
      await registerUser.mutateAsync(data);
      toast('User created successfully', 'success');
      reset({ fullName: '', email: '', password: '', role: 'CASHIER' });
      onClose();
    } catch (err) {
      reportMutationError(err, 'Failed to create user');
    }
  }

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogHeader>
        <DialogTitle>Add New User</DialogTitle>
      </DialogHeader>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="fullName">Full Name *</Label>
          <Input id="fullName" {...register('fullName')} placeholder="e.g. John Doe" />
          {errors.fullName && <p className="text-sm text-destructive">{errors.fullName.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email *</Label>
          <Input id="email" type="email" {...register('email')} placeholder="e.g. john@example.com" />
          {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password *</Label>
          <Input id="password" type="password" {...register('password')} placeholder="Min 6 characters" />
          {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="role">Role *</Label>
          <Select id="role" {...register('role')}>
            {ROLES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </Select>
          {errors.role && <p className="text-sm text-destructive">{errors.role.message}</p>}
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              'Create User'
            )}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
