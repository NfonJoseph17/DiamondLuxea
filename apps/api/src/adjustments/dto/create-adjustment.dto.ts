import { IsString, IsOptional, IsEnum, IsInt, Min, IsDateString, MaxLength } from 'class-validator';
import { AdjustmentType, AdjustmentReasonType } from '../../common/constants/roles';

export class CreateAdjustmentDto {
  @IsString()
  productId: string;

  @IsEnum(AdjustmentType)
  adjustmentType: AdjustmentType;

  @IsEnum(AdjustmentReasonType)
  reasonType: AdjustmentReasonType;

  @IsInt()
  @Min(1)
  quantity: number;

  @IsOptional()
  @IsString()
  unitId?: string;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsDateString()
  adjustedAt?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  clientMutationId?: string;
}
