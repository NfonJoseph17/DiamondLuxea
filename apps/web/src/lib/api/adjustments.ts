import { api } from './client';
import type { StockAdjustment } from '@/types';

export type CreateAdjustmentPayload = {
  productId: string;
  adjustmentType: 'INCREASE' | 'DECREASE';
  reasonType: 'BREAKAGE' | 'LOSS' | 'COUNT_CORRECTION' | 'DAMAGE' | 'OTHER';
  quantity: number;
  unitId?: string;
  note?: string;
  _offlineAdjustment?: {
    productName: string;
    unitName?: string | null;
    unitConversionValue?: number | null;
  };
};

export function getAdjustments() {
  return api.get<StockAdjustment[]>('/adjustments');
}

export function createAdjustment(data: CreateAdjustmentPayload) {
  return api.post<StockAdjustment>('/adjustments', data);
}
