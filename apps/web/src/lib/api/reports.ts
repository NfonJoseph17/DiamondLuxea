import { api } from './client';

export interface ReportSummary {
  totalSales: number;
  totalQtySold: number;
  profit: number;
  stockPurchased: number;
  /** Operating expenses in the selected period (utilities, rent, etc.) */
  totalExpenditures: number;
  lowStockCount: number;
  lowStockItems: Array<{
    id: string;
    name: string;
    quantity: number;
    quantityInStorage?: number;
    baseUnitConversionValue?: number;
    lowStockLevel: number;
    unitType: string;
  }>;
}

export type SalesPaymentReportFilter = 'all' | 'paid' | 'outstanding';

export interface SalesReportRow {
  date: string;
  saleId: string;
  product: string;
  productId: string;
  quantity: number;
  unitType: string;
  unitPurchasePrice: number;
  unitSellingPrice: number;
  subtotal: number;
  profit: number;
  cashier: string;
  notes: string | null;
  paymentStatus: string;
  amountPaid: number;
  balanceDue: number;
}

export interface PurchasesReportRow {
  date: string;
  purchaseId: string;
  product: string;
  productId: string;
  quantity: number;
  unitType: string;
  unitPurchasePrice: number;
  subtotal: number;
  supplier: string | null;
  createdBy: string;
  notes: string | null;
}

export interface StockMovementRow {
  date: string;
  product: string;
  productId: string;
  transactionType: string;
  quantityChange: number;
  unitType: string;
  referenceType: string;
  referenceId: string;
}

export interface StockCorrectionRow {
  date: string;
  product: string;
  productId: string;
  adjustmentType: string;
  reasonType: string;
  quantity: number;
  unitType: string;
  note: string | null;
  createdBy: string;
}

export interface DailySummaryRow {
  date: string;
  salesTotal: number;
  salesCount: number;
  sessions: Array<{ opened: string; closed: string | null; status: string }>;
}

export interface ExpenditureReportRow {
  id: string;
  spentAt: string;
  amount: number;
  category: string | null;
  description: string;
  notes: string | null;
  recordedBy: string;
}

export interface ReportParams {
  from?: string;
  to?: string;
  tzOffset?: number; // minutes, e.g. 60 for UTC+1
  /** all | paid | outstanding (unpaid + partial) */
  payment?: SalesPaymentReportFilter;
}

function buildReportQuery(params: ReportParams): string {
  if (!params?.from || !params?.to) return '';
  const parts = [
    `from=${encodeURIComponent(params.from)}`,
    `to=${encodeURIComponent(params.to)}`,
  ];
  if (params.tzOffset != null) {
    parts.push(`tzOffset=${encodeURIComponent(String(params.tzOffset))}`);
  }
  if (params.payment && params.payment !== 'all') {
    parts.push(`payment=${encodeURIComponent(params.payment)}`);
  }
  return `?${parts.join('&')}`;
}

export function getReportSummary(params?: ReportParams) {
  const q = buildReportQuery(params ?? {});
  if (!q) return api.get<ReportSummary>('/reports/summary');
  return api.get<ReportSummary>(`/reports/summary${q}`);
}

export function getSalesReport(params?: ReportParams) {
  const q = buildReportQuery(params ?? {});
  if (!q) return api.get<SalesReportRow[]>('/reports/sales');
  return api.get<SalesReportRow[]>(`/reports/sales${q}`);
}

export function getPurchasesReport(params?: ReportParams) {
  const q = buildReportQuery(params ?? {});
  if (!q) return api.get<PurchasesReportRow[]>('/reports/purchases');
  return api.get<PurchasesReportRow[]>(`/reports/purchases${q}`);
}

export function getExpenditureReport(params?: ReportParams) {
  const q = buildReportQuery(params ?? {});
  if (!q) return api.get<ExpenditureReportRow[]>('/reports/expenditures');
  return api.get<ExpenditureReportRow[]>(`/reports/expenditures${q}`);
}

export function getStockMovementsReport(params?: ReportParams) {
  if (!params?.from || !params?.to) return api.get<StockMovementRow[]>('/reports/stock-movements');
  const q = `?from=${encodeURIComponent(params.from)}&to=${encodeURIComponent(params.to)}`;
  return api.get<StockMovementRow[]>(`/reports/stock-movements${q}`);
}

export function getStockCorrectionsReport(params?: ReportParams) {
  if (!params?.from || !params?.to) return api.get<StockCorrectionRow[]>('/reports/stock-corrections');
  const q = `?from=${encodeURIComponent(params.from)}&to=${encodeURIComponent(params.to)}`;
  return api.get<StockCorrectionRow[]>(`/reports/stock-corrections${q}`);
}

export function getDailySummaryReport(params?: ReportParams) {
  if (!params?.from || !params?.to) return api.get<DailySummaryRow[]>('/reports/daily-summary');
  const q = `?from=${encodeURIComponent(params.from)}&to=${encodeURIComponent(params.to)}`;
  return api.get<DailySummaryRow[]>(`/reports/daily-summary${q}`);
}
