'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth/auth-context';
import { Badge } from '@/components/ui/badge';
import { useBarName } from '@/lib/hooks/use-bar-settings';
import { useUnits, useCreateUnit, useUpdateUnit, useDeleteUnit } from '@/lib/hooks/use-units';
import { toast } from '@/components/ui/toaster';
import { ApiError } from '@/lib/api/client';
import { Settings, Ruler, Plus, Pencil, Trash2, Loader2 } from 'lucide-react';

export default function SettingsPage() {
  const { user } = useAuth();
  const { barName, updateBarName } = useBarName();
  const [barNameInput, setBarNameInput] = useState(barName);

  useEffect(() => {
    setBarNameInput(barName);
  }, [barName]);

  const handleSaveBarName = () => {
    updateBarName(barNameInput);
    toast('Bar name saved', 'success');
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Settings</h2>
        <p className="text-muted-foreground">
          Your account and preferences
        </p>
      </div>
      <Card>
        <CardHeader className="flex flex-row items-center gap-3">
          <Settings className="h-6 w-6 text-muted-foreground" />
          <div>
            <CardTitle>Your Profile</CardTitle>
            <CardDescription>Current account information</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Name</span>
              <span className="font-medium">{user?.fullName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Email</span>
              <span className="font-medium">{user?.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Role</span>
              <Badge variant="secondary">{user?.role}</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
      {user?.role === 'MANAGER' && (
        <Card>
          <CardHeader>
            <CardTitle>Bar / Business</CardTitle>
            <CardDescription>
              Your bar name appears on receipts. Edit it here.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="barName">Bar name</Label>
              <Input
                id="barName"
                value={barNameInput}
                onChange={(e) => setBarNameInput(e.target.value)}
                placeholder="e.g. Bar Depot"
              />
            </div>
            <Button onClick={handleSaveBarName}>Save</Button>
          </CardContent>
        </Card>
      )}
      {user?.role === 'MANAGER' && (
        <UnitsManagerCard />
      )}
    </div>
  );
}

function UnitsManagerCard() {
  const { data: units, isLoading } = useUnits();
  const createUnit = useCreateUnit();
  const updateUnit = useUpdateUnit();
  const deleteUnit = useDeleteUnit();
  const [name, setName] = useState('');
  const [conversionValue, setConversionValue] = useState('1');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editConversionValue, setEditConversionValue] = useState('');

  const handleCreate = async () => {
    const cv = parseInt(conversionValue, 10);
    if (!name.trim() || isNaN(cv) || cv <= 0) {
      toast('Name required and conversion value must be > 0', 'error');
      return;
    }
    try {
      await createUnit.mutateAsync({ name: name.trim(), conversionValue: cv });
      toast('Unit created', 'success');
      setName('');
      setConversionValue('1');
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Failed to create unit', 'error');
    }
  };

  const startEdit = (id: string, n: string, cv: number) => {
    setEditingId(id);
    setEditName(n);
    setEditConversionValue(String(cv));
  };

  const handleUpdate = async () => {
    if (!editingId) return;
    const cv = parseInt(editConversionValue, 10);
    if (!editName.trim() || isNaN(cv) || cv <= 0) {
      toast('Name required and conversion value must be > 0', 'error');
      return;
    }
    try {
      await updateUnit.mutateAsync({ id: editingId, data: { name: editName.trim(), conversionValue: cv } });
      toast('Unit updated', 'success');
      setEditingId(null);
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Failed to update unit', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this unit? It cannot be deleted if used by products, sales, or purchases.')) return;
    try {
      await deleteUnit.mutateAsync(id);
      toast('Unit deleted', 'success');
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Cannot delete unit in use', 'error');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Ruler className="h-5 w-5 text-muted-foreground" />
          Units
        </CardTitle>
        <CardDescription>
          Manage units for products and transactions. conversionValue = base units per unit (e.g. bottle=1, crate=12).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Input
            placeholder="Unit name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-32"
          />
          <Input
            type="number"
            min={1}
            placeholder="Conversion"
            value={conversionValue}
            onChange={(e) => setConversionValue(e.target.value)}
            className="w-24"
          />
          <Button size="sm" onClick={handleCreate} disabled={createUnit.isPending}>
            {createUnit.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Add
          </Button>
        </div>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-2 pr-4">Name</th>
                  <th className="pb-2 pr-4">Conversion value</th>
                  <th className="pb-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {units?.map((u) => (
                  <tr key={u.id} className="border-b last:border-0">
                    <td className="py-2 pr-4">
                      {editingId === u.id ? (
                        <Input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="h-8 w-32"
                        />
                      ) : (
                        u.name
                      )}
                    </td>
                    <td className="py-2 pr-4">
                      {editingId === u.id ? (
                        <Input
                          type="number"
                          min={1}
                          value={editConversionValue}
                          onChange={(e) => setEditConversionValue(e.target.value)}
                          className="h-8 w-20"
                        />
                      ) : (
                        u.conversionValue
                      )}
                    </td>
                    <td className="py-2">
                      {editingId === u.id ? (
                        <div className="flex gap-1">
                          <Button size="sm" variant="outline" onClick={handleUpdate} disabled={updateUnit.isPending}>
                            Save
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>Cancel</Button>
                        </div>
                      ) : (
                        <div className="flex gap-1">
                          <button
                            onClick={() => startEdit(u.id, u.name, u.conversionValue)}
                            className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                            title="Edit"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(u.id)}
                            disabled={deleteUnit.isPending}
                            className="rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
