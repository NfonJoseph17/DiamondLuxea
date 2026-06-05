'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import {
  useReportSummary,
  useSalesReport,
  usePurchasesReport,
  useExpenditureReport,
} from '@/lib/hooks/use-reports';
import type { SalesPaymentReportFilter } from '@/lib/api/reports';
import {
  getDateRangeForPreset,
  formatDateRangeLabel,
  type DateRangePreset,
} from '@/lib/utils/date-range';
import { formatStockQuantityMixed, formatUnitLabel } from '@/lib/utils/units';
import { downloadCsv } from '@/lib/utils/csv';
import {
  TrendingUp,
  AlertTriangle,
  Loader2,
  Wallet,
} from 'lucide-react';
import { ReportSection } from '@/components/reports/report-section';
import { ReportTable } from '@/components/reports/report-table';

function formatPaymentCell(status: string, amountPaid: number, balanceDue: number) {
  if (status === 'PAID') return 'Paid';
  if (status === 'UNPAID') return 'Unpaid';
  return `Partial (due ${balanceDue.toLocaleString()} XAF)`;
}

export default function ReportsPage() {
  const [preset, setPreset] = useState<DateRangePreset>('today');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [salesPaymentFilter, setSalesPaymentFilter] = useState<SalesPaymentReportFilter>('all');

  const { from, to } = useMemo(
    () => getDateRangeForPreset(preset, customFrom, customTo),
    [preset, customFrom, customTo]
  );

  const params = useMemo(
    () => ({
      from,
      to,
      tzOffset: typeof window !== 'undefined' ? -new Date().getTimezoneOffset() : undefined,
      payment: salesPaymentFilter,
    }),
    [from, to, salesPaymentFilter]
  );

  const summary = useReportSummary(params);
  const salesReport = useSalesReport(params);
  const purchasesReport = usePurchasesReport(params);
  const expenditureReport = useExpenditureReport(params);

  const isLoading =
    summary.isLoading ||
    salesReport.isLoading ||
    purchasesReport.isLoading ||
    expenditureReport.isLoading;

  const reportError =
    summary.error ?? salesReport.error ?? purchasesReport.error ?? expenditureReport.error;
  const rangeLabel = formatDateRangeLabel(preset, from, to);

  /** Gross sales profit minus operating expenditures in the selected period */
  const netProfitAfterExpenditures = useMemo(() => {
    const gross = summary.data?.profit ?? 0;
    const exp = summary.data?.totalExpenditures ?? 0;
    return gross - exp;
  }, [summary.data?.profit, summary.data?.totalExpenditures]);

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleString('en-GB', {
      dateStyle: 'short',
      timeStyle: 'short',
    });

  const formatXaf = (n: number) =>
    n.toLocaleString('fr-CM', {
      style: 'currency',
      currency: 'XAF',
      maximumFractionDigits: 0,
    });

  const exportSalesCsv = () => {
    const rows = salesReport.data ?? [];
    downloadCsv(
      `sales-report-${from}-${to}.csv`,
      [
        'Date',
        'Product',
        'Quantity',
        'Unit',
        'Purchase Price',
        'Selling Price',
        'Total Sales',
        'Profit',
        'Cashier',
        'Payment',
        'Amount paid',
        'Balance due',
        'Notes',
      ],
      rows.map((r) => [
        formatDate(r.date),
        r.product,
        r.quantity,
        formatUnitLabel(r.unitType, true),
        r.unitPurchasePrice,
        r.unitSellingPrice,
        r.subtotal,
        r.profit,
        r.cashier,
        r.paymentStatus,
        r.amountPaid,
        r.balanceDue,
        r.notes ?? '',
      ])
    );
  };

  const exportPurchasesCsv = () => {
    const rows = purchasesReport.data ?? [];
    downloadCsv(
      `purchases-report-${from}-${to}.csv`,
      ['Date', 'Product', 'Quantity', 'Unit', 'Purchase Price', 'Subtotal', 'Supplier', 'Created By', 'Notes'],
      rows.map((r) => [
        formatDate(r.date),
        r.product,
        r.quantity,
        formatUnitLabel(r.unitType, true),
        r.unitPurchasePrice,
        r.subtotal,
        r.supplier ?? '',
        r.createdBy,
        r.notes ?? '',
      ])
    );
  };

  const exportExpendituresCsv = () => {
    const rows = expenditureReport.data ?? [];
    downloadCsv(
      `expenditures-report-${from}-${to}.csv`,
      ['Date', 'Amount (XAF)', 'Category', 'Description', 'Notes', 'Recorded by'],
      rows.map((r) => [
        formatDate(r.spentAt),
        r.amount,
        r.category ?? '',
        r.description,
        r.notes ?? '',
        r.recordedBy,
      ])
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Reports</h2>
        <p className="text-muted-foreground">View sales, purchases, expenditures, and stock summaries</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Date range</CardTitle>
          <CardDescription>Filter all reports by date</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <Label htmlFor="preset">Period</Label>
            <Select
              id="preset"
              value={preset}
              onChange={(e) => setPreset(e.target.value as DateRangePreset)}
            >
              <option value="today">Today</option>
              <option value="week">Last 7 days</option>
              <option value="month">This month</option>
              <option value="custom">Custom range</option>
            </Select>
          </div>
          {preset === 'custom' && (
            <>
              <div className="flex items-center gap-2">
                <Label htmlFor="from">From</Label>
                <Input
                  id="from"
                  type="date"
                  value={customFrom}
                  onChange={(e) => setCustomFrom(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor="to">To</Label>
                <Input
                  id="to"
                  type="date"
                  value={customTo}
                  onChange={(e) => setCustomTo(e.target.value)}
                />
              </div>
            </>
          )}
          <div className="flex items-center gap-2">
            <Label htmlFor="sales-payment">Sales payment</Label>
            <Select
              id="sales-payment"
              value={salesPaymentFilter}
              onChange={(e) => setSalesPaymentFilter(e.target.value as SalesPaymentReportFilter)}
            >
              <option value="all">All sales</option>
              <option value="paid">Paid in full only</option>
              <option value="outstanding">Unpaid or partial only</option>
            </Select>
          </div>
          <div className="text-sm text-muted-foreground self-center">
            Showing: {rangeLabel}
            {salesPaymentFilter !== 'all' && (
              <span className="ml-1 block sm:inline">
                ·{' '}
                {salesPaymentFilter === 'paid'
                  ? 'totals & table: paid in full'
                  : 'totals & table: not fully paid'}
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : reportError ? (
        <Card>
          <CardContent className="py-8 text-center space-y-2">
            <p className="text-sm text-destructive font-medium">Failed to load reports</p>
            <p className="text-xs text-muted-foreground">
              {reportError instanceof Error ? reportError.message : 'Please try again.'}
            </p>
            <p className="text-xs text-muted-foreground">
              Ensure the database is migrated and seeded (see README).
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total sales</CardTitle>
                <TrendingUp className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatXaf(summary.data?.totalSales ?? 0)}</div>
                <p className="text-xs text-muted-foreground">{summary.data?.totalQtySold ?? 0} items sold</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total expenditures</CardTitle>
                <Wallet className="h-4 w-4 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatXaf(summary.data?.totalExpenditures ?? 0)}</div>
                <p className="text-xs text-muted-foreground">Bills &amp; operating costs in period</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Low stock items</CardTitle>
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summary.data?.lowStockCount ?? 0}</div>
                <p className="text-xs text-muted-foreground">Need restocking</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Profit</CardTitle>
                <TrendingUp className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div
                  className={`text-2xl font-bold ${netProfitAfterExpenditures < 0 ? 'text-destructive' : ''}`}
                >
                  {formatXaf(netProfitAfterExpenditures)}
                </div>
                <p className="text-xs text-muted-foreground">After deducting expenditures</p>
                <p className="text-xs text-muted-foreground">
                  {summary.data?.totalSales
                    ? ((netProfitAfterExpenditures / summary.data.totalSales) * 100).toFixed(1) +
                      '% of sales'
                    : '—'}
                </p>
              </CardContent>
            </Card>
          </div>

          {summary.data?.lowStockItems && summary.data.lowStockItems.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Low stock items</CardTitle>
                <CardDescription>Products below threshold</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-muted-foreground">
                        <th className="pb-2 pr-4">Product</th>
                        <th className="pb-2 pr-4 text-right">Current</th>
                        <th className="pb-2 pr-4 text-right">Threshold</th>
                        <th className="pb-2">Unit</th>
                      </tr>
                    </thead>
                    <tbody>
                      {summary.data.lowStockItems.map((item) => {
                        const stockDisplay =
                          item.quantityInStorage != null && item.baseUnitConversionValue != null
                            ? formatStockQuantityMixed(
                                item.quantityInStorage,
                                item.unitType,
                                item.baseUnitConversionValue
                              )
                            : String(item.quantity);
                        return (
                          <tr key={item.id} className="border-b last:border-0">
                            <td className="py-2 pr-4">{item.name}</td>
                            <td className="py-2 pr-4 text-right font-medium">{stockDisplay}</td>
                            <td className="py-2 pr-4 text-right">{item.lowStockLevel}</td>
                            <td className="py-2">{formatUnitLabel(item.unitType, true)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          <ReportSection
            title="Sales report"
            description="Items sold with prices, profit, and payment status"
            onExport={exportSalesCsv}
            isEmpty={!salesReport.data?.length}
          >
            <ReportTable
              headers={[
                'Date',
                'Product',
                'Qty',
                'Unit',
                'Purchase',
                'Selling',
                'Total',
                'Profit',
                'Cashier',
                'Payment',
                'Notes',
              ]}
              rows={(salesReport.data ?? []).map((r) => [
                formatDate(r.date),
                r.product,
                r.quantity,
                formatUnitLabel(r.unitType, true),
                formatXaf(r.unitPurchasePrice),
                formatXaf(r.unitSellingPrice),
                formatXaf(r.subtotal),
                formatXaf(r.profit),
                r.cashier,
                formatPaymentCell(r.paymentStatus, r.amountPaid, r.balanceDue),
                r.notes ?? '—',
              ])}
            />
          </ReportSection>

          <ReportSection title="Purchase report" description="Stock purchased from suppliers" onExport={exportPurchasesCsv} isEmpty={!purchasesReport.data?.length}>
            <ReportTable
              headers={['Date', 'Product', 'Qty', 'Unit', 'Cost/unit', 'Subtotal', 'Supplier', 'Created by', 'Notes']}
              rows={(purchasesReport.data ?? []).map((r) => [
                formatDate(r.date),
                r.product,
                r.quantity,
                formatUnitLabel(r.unitType, true),
                formatXaf(r.unitPurchasePrice),
                formatXaf(r.subtotal),
                r.supplier ?? '—',
                r.createdBy,
                r.notes ?? '—',
              ])}
            />
          </ReportSection>

          <ReportSection
            title="Expenditure report"
            description="Operating expenses (utilities, rent, etc.) recorded in the period"
            onExport={exportExpendituresCsv}
            isEmpty={!expenditureReport.data?.length}
          >
            <ReportTable
              headers={['Date', 'Amount', 'Category', 'Description', 'Notes', 'Recorded by']}
              rows={(expenditureReport.data ?? []).map((r) => [
                formatDate(r.spentAt),
                formatXaf(r.amount),
                r.category ?? '—',
                r.description,
                r.notes ?? '—',
                r.recordedBy,
              ])}
            />
          </ReportSection>
        </>
      )}
    </div>
  );
}
