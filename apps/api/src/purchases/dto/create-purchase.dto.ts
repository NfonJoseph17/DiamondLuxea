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
} from 'class-validator';
import { Type } from 'class-transformer';

export class PurchaseItemDto {
  @IsString()
  productId: string;

  @IsInt()
  @Min(1)
  quantity: number;

  @IsString()
  unitId: string;
}

export class CreatePurchaseDto {
  @IsOptional()
  @IsString()
  supplierId?: string;

  @IsOptional()
  @IsString()
  referenceNumber?: string;

  @IsOptional()
  @IsDateString()
  purchasedAt?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PurchaseItemDto)
  items: PurchaseItemDto[];

  @IsOptional()
  @IsString()
  @MaxLength(64)
  clientMutationId?: string;
}
