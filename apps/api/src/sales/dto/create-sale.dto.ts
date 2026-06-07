import {
  IsString,
  IsOptional,
  IsArray,
  ValidateNested,
  IsInt,
  Min,
  IsDateString,
  ArrayMinSize,
  MaxLength,
  IsIn,
  IsNumber,
} from 'class-validator';
import { Type } from 'class-transformer';

export class SaleItemDto {
  @IsString()
  productId: string;

  @IsInt()
  @Min(1)
  quantity: number;

  @IsString()
  unitId: string;

  /**
   * The chosen price tier for this unit (a unit may have several prices).
   * Validated server-side against the product's configured prices; ignored
   * if it doesn't match an allowed price.
   */
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  unitSellingPrice?: number;
}

export class CreateSaleDto {
  @IsOptional()
  @IsDateString()
  soldAt?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  /** Defaults to PAID (full amount) when omitted */
  @IsOptional()
  @IsIn(['UNPAID', 'PAID', 'PARTIAL'])
  paymentStatus?: 'UNPAID' | 'PAID' | 'PARTIAL';

  /** Required when paymentStatus is PARTIAL — cumulative amount received */
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  amountPaid?: number;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => SaleItemDto)
  items: SaleItemDto[];

  /** Idempotent offline sync: same value returns existing sale */
  @IsOptional()
  @IsString()
  @MaxLength(64)
  clientMutationId?: string;
}
