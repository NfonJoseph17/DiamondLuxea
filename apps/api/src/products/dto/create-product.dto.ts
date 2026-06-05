import {
  IsString,
  IsOptional,
  IsInt,
  IsNumber,
  Min,
} from 'class-validator';

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

  /** Public path (/api/uploads/...) or external https image URL */
  @IsOptional()
  @IsString()
  imageUrl?: string;
}
