'use client';

import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import type { PaymentStatus } from '@/types';

type Props = {
  total: number;
  paymentStatus: PaymentStatus;
  onPaymentStatusChange: (v: PaymentStatus) => void;
  partialAmountPaid: string;
  onPartialAmountPaidChange: (v: string) => void;
};

export function SalePaymentFields({
  total,
  paymentStatus,
  onPaymentStatusChange,
  partialAmountPaid,
  onPartialAmountPaidChange,
}: Props) {
  const paidNum = parseFloat(String(partialAmountPaid).replace(/,/g, '')) || 0;
  const balance =
    paymentStatus === 'PARTIAL' ? Math.max(0, total - paidNum) : paymentStatus === 'UNPAID' ? total : 0;

  return (
    <div className="space-y-3 rounded-lg border p-4">
      <div className="space-y-2">
        <Label>Payment</Label>
        <Select
          value={paymentStatus}
          onChange={(e) => onPaymentStatusChange(e.target.value as PaymentStatus)}
        >
          <option value="PAID">Paid in full</option>
          <option value="UNPAID">Not paid yet</option>
          <option value="PARTIAL">Partial payment</option>
        </Select>
      </div>
      {paymentStatus === 'PARTIAL' && (
        <div className="space-y-2">
          <div className="space-y-1">
            <Label className="text-xs">Amount received (XAF)</Label>
            <Input
              type="number"
              min={1}
              step={1}
              value={partialAmountPaid}
              onChange={(e) => onPartialAmountPaidChange(e.target.value)}
              placeholder="e.g. 5000"
            />
          </div>
          <p className="text-sm text-muted-foreground">
            Sale total: {total.toLocaleString()} XAF
            {paidNum > 0 && paidNum < total && (
              <> · Balance due: {balance.toLocaleString()} XAF</>
            )}
          </p>
        </div>
      )}
      {paymentStatus === 'UNPAID' && (
        <p className="text-sm text-muted-foreground">Amount owed: {total.toLocaleString()} XAF</p>
      )}
    </div>
  );
}

export function validatePartialPayment(total: number, partialAmountPaid: string): string | null {
  const n = parseFloat(String(partialAmountPaid).replace(/,/g, ''));
  if (!Number.isFinite(n) || n <= 0) {
    return 'Enter the amount received for a partial payment';
  }
  if (n >= total) {
    return 'Partial amount must be less than the sale total. Use Paid in full instead.';
  }
  return null;
}
