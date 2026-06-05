'use client';

import { useQuery } from '@tanstack/react-query';
import {
  getReportSummary,
  getSalesReport,
  getPurchasesReport,
  getExpenditureReport,
  getStockMovementsReport,
  getStockCorrectionsReport,
  type ReportParams,
} from '@/lib/api/reports';

export function useReportSummary(params?: ReportParams) {
  return useQuery({
    queryKey: ['reports', 'summary', params?.from, params?.to, params?.tzOffset, params?.payment],
    queryFn: () => getReportSummary(params),
  });
}

export function useSalesReport(params?: ReportParams) {
  return useQuery({
    queryKey: ['reports', 'sales', params?.from, params?.to, params?.tzOffset, params?.payment],
    queryFn: () => getSalesReport(params),
  });
}

export function usePurchasesReport(params?: ReportParams) {
  return useQuery({
    queryKey: ['reports', 'purchases', params?.from, params?.to, params?.tzOffset],
    queryFn: () => getPurchasesReport(params),
  });
}

export function useExpenditureReport(params?: ReportParams) {
  return useQuery({
    queryKey: ['reports', 'expenditures', params?.from, params?.to, params?.tzOffset],
    queryFn: () => getExpenditureReport(params),
  });
}

export function useStockMovementsReport(params?: ReportParams) {
  return useQuery({
    queryKey: ['reports', 'stock-movements', params?.from, params?.to],
    queryFn: () => getStockMovementsReport(params),
  });
}

export function useStockCorrectionsReport(params?: ReportParams) {
  return useQuery({
    queryKey: ['reports', 'stock-corrections', params?.from, params?.to],
    queryFn: () => getStockCorrectionsReport(params),
  });
}
