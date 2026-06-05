import { IsIn, IsNumber, Min, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateSalePaymentDto {
  @IsIn(['UNPAID', 'PAID', 'PARTIAL'])
  paymentStatus: 'UNPAID' | 'PAID' | 'PARTIAL';

  /** Required when paymentStatus is PARTIAL */
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  amountPaid?: number;
}
