import {
  IsString,
  IsOptional,
  IsNumber,
  Min,
  MaxLength,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateExpenditureDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  amount?: number;

  @IsOptional()
  @IsDateString()
  spentAt?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  category?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}
