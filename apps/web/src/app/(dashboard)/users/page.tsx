'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AuthGuard } from '@/lib/auth/auth-guard';
import { useAuth } from '@/lib/auth/auth-context';
import { useUsers, useDeleteUser } from '@/lib/hooks/use-users';
import { AddUserDialog } from '@/components/users/add-user-dialog';
import { EditUserDialog } from '@/components/users/edit-user-dialog';
import { toast } from '@/components/ui/toaster';
import { reportMutationError } from '@/lib/utils/mutation-feedback';
import { Loader2, Plus, Users, Pencil, Trash2 } from 'lucide-react';
import type { User } from '@/types';

function roleBadgeVariant(role: User['role']) {
  switch (role) {
    case 'MANAGER':
      return 'default';
    case 'SALES':
      return 'outline';
    default:
      return 'secondary';
  }
}

export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const { data: users, isLoading, error } = useUsers();
  const deleteUser = useDeleteUser();
  const [showAdd, setShowAdd] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);

  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleDelete(u: User) {
    if (u.id === currentUser?.id) {
      toast('You cannot delete your own account', 'error');
      return;
    }
    if (!confirm(`Permanently delete ${u.fullName}? This cannot be undone.`)) return;
    setDeletingId(u.id);
    try {
      await deleteUser.mutateAsync({ id: u.id });
      toast('User deleted', 'success');
    } catch (err) {
      reportMutationError(err, 'Failed to delete user');
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <AuthGuard allowedRoles={['MANAGER']}>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Users</h2>
            <p className="text-muted-foreground">
              Add staff and manage who can access the system
            </p>
          </div>
          <Button onClick={() => setShowAdd(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add User
          </Button>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center gap-3">
            <Users className="h-6 w-6 text-muted-foreground" />
            <div>
              <CardTitle>User Management</CardTitle>
              <CardDescription>
                Register new staff, manage roles (Manager, Cashier), and delete accounts.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : error ? (
              <p className="text-sm text-destructive">Failed to load users. Please try again.</p>
            ) : !users?.length ? (
              <div className="flex flex-col items-center gap-3 py-8">
                <Users className="h-10 w-10 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">No users yet. Add your first user to get started.</p>
                <Button size="sm" onClick={() => setShowAdd(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add User
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="pb-3 text-left font-medium">Name</th>
                      <th className="pb-3 text-left font-medium">Email</th>
                      <th className="pb-3 text-left font-medium">Role</th>
                      <th className="pb-3 text-left font-medium">Status</th>
                      <th className="pb-3 text-right font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.id} className="border-b last:border-0">
                        <td className="py-3">{u.fullName}</td>
                        <td className="py-3 text-muted-foreground">{u.email}</td>
                        <td className="py-3">
                          <Badge variant={roleBadgeVariant(u.role)}>{u.role}</Badge>
                        </td>
                        <td className="py-3">
                          <Badge variant={u.isActive ? 'outline' : 'secondary'}>
                            {u.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </td>
                        <td className="py-3 text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => setEditUser(u)}
                              title="Edit user"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            {u.id !== currentUser?.id && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={() => handleDelete(u)}
                                disabled={deletingId === u.id}
                                title="Delete user"
                              >
                                {deletingId === u.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Trash2 className="h-4 w-4" />
                                )}
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <AddUserDialog open={showAdd} onClose={() => setShowAdd(false)} />
      <EditUserDialog
        open={!!editUser}
        user={editUser}
        onClose={() => setEditUser(null)}
      />
    </AuthGuard>
  );
}
