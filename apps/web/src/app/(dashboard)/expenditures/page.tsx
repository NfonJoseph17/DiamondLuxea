'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  useExpenditures,
  useCreateExpenditure,
  useDeleteExpenditure,
} from '@/lib/hooks/use-expenditures';
import { toast } from '@/components/ui/toaster';
import { ApiError } from '@/lib/api/client';
import { Loader2, Trash2, Receipt, FileText } from 'lucide-react';

function formatXaf(n: number) {
  return n.toLocaleString('fr-CM', {
    style: 'currency',
    currency: 'XAF',
    maximumFractionDigits: 0,
  });
}

export default function ExpendituresPage() {
  const { data: rows, isLoading } = useExpenditures();
  const createExp = useCreateExpenditure();
  const deleteExp = useDeleteExpenditure();

  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');

  const totalListed = useMemo(
    () => rows?.reduce((s, r) => s + parseFloat(r.amount || '0'), 0) ?? 0,
    [rows]
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const n = parseFloat(amount.replace(/,/g, ''));
    if (!Number.isFinite(n) || n <= 0) {
      toast('Enter a valid amount', 'error');
      return;
    }
    if (!description.trim()) {
      toast('Description is required', 'error');
      return;
    }
    try {
      await createExp.mutateAsync({
        amount: n,
        description: description.trim(),
      });
      toast('Expenditure recorded', 'success');
      setAmount('');
      setDescription('');
    } catch (err) {
      if (err instanceof ApiError) toast(err.message, 'error');
      else toast('Failed to save', 'error');
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this expenditure?')) return;
    try {
      await deleteExp.mutateAsync(id);
      toast('Deleted', 'success');
    } catch (err) {
      if (err instanceof ApiError) toast(err.message, 'error');
      else toast('Failed to delete', 'error');
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Expenditures</h2>
        <p className="text-muted-foreground">
          Record operating costs: utilities, rent, fees, and other bills. Shown on the dashboard and reports.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Receipt className="h-5 w-5" />
              Add expenditure
            </CardTitle>
            <CardDescription>Amount and what it was for. The date is set automatically when you save.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Amount (XAF)</Label>
                <Input
                  id="amount"
                  type="number"
                  min={0.01}
                  step="any"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="e.g. 25000"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. ENEO March invoice"
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={createExp.isPending}>
                {createExp.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving…
                  </>
                ) : (
                  'Save expenditure'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-2">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="h-5 w-5" />
                Recent records
              </CardTitle>
              <CardDescription>Up to 500 most recent entries</CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/reports">View in reports</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : !rows?.length ? (
              <p className="text-sm text-muted-foreground">No expenditures yet.</p>
            ) : (
              <div className="space-y-3">
                <p className="text-sm font-medium text-right">
                  Total (listed): {formatXaf(totalListed)}
                </p>
                <div className="overflow-x-auto rounded-md border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50 text-left text-muted-foreground">
                        <th className="p-2 pr-3">Date</th>
                        <th className="p-2 pr-3">Description</th>
                        <th className="p-2 pr-3">Category</th>
                        <th className="p-2 pr-3 text-right">Amount</th>
                        <th className="p-2 pr-3">By</th>
                        <th className="p-2 w-10" />
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r) => (
                        <tr key={r.id} className="border-b last:border-0">
                          <td className="p-2 pr-3 whitespace-nowrap">
                            {new Date(r.spentAt).toLocaleDateString('en-GB')}
                          </td>
                          <td className="p-2 pr-3 max-w-[200px]">
                            <div className="font-medium truncate">{r.description}</div>
                            {r.notes && (
                              <div className="text-xs text-muted-foreground truncate">{r.notes}</div>
                            )}
                          </td>
                          <td className="p-2 pr-3 text-muted-foreground">{r.category ?? '—'}</td>
                          <td className="p-2 pr-3 text-right font-medium">
                            {formatXaf(parseFloat(r.amount || '0'))}
                          </td>
                          <td className="p-2 pr-3 text-muted-foreground text-xs">
                            {r.createdBy?.fullName ?? '—'}
                          </td>
                          <td className="p-2">
                            <button
                              type="button"
                              onClick={() => handleDelete(r.id)}
                              className="rounded p-1.5 text-destructive hover:bg-destructive/10"
                              title="Delete"
                              disabled={deleteExp.isPending}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
