import {
  IsString,
  IsOptional,
  IsInt,
  IsNumber,
  Min,
  IsArray,
  ValidateNested,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class UnitPriceItemDto {
  @IsString()
  unitId: string;

  @IsNumber()
  @Min(0)
  sellingPrice: number;

  /** Optional tier name shown on the sales button, e.g. "wholesale". */
  @IsOptional()
  @IsString()
  @MaxLength(40)
  label?: string;
}

export class CreateProductDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  sku?: string;

  @IsString()
  category: string;

  @IsString()
  baseUnitId: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  lowStockLevel?: number;

  @IsNumber()
  @Min(0)
  purchasePrice: number;

  @IsNumber()
  @Min(0)
  retailPrice: number;

  @IsNumber()
  @Min(0)
  wholesalePrice: number;

  @IsOptional()
  @IsString()
  defaultSupplierId?: string;

  /** Explicit selling price per unit (overrides derived retail/wholesale). */
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UnitPriceItemDto)
  unitPrices?: UnitPriceItemDto[];

  /** Public path (/api/uploads/...) or external https image URL */
  @IsOptional()
  @IsString()
  imageUrl?: string;
}
