import {
  IsString,
  IsOptional,
  IsArray,
  ValidateNested,
  IsInt,
  Min,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';

export class TransferItemDto {
  @IsString()
  productId: string;

  @IsInt()
  @Min(1)
  quantity: number;
}

export class CreateTransferDto {
  @IsOptional()
  @IsString()
  fromLocationId?: string;

  @IsOptional()
  @IsString()
  toLocationId?: string;

  @IsOptional()
  @IsDateString()
  transferredAt?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TransferItemDto)
  items: TransferItemDto[];
}
