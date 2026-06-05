import { IsString, IsOptional, IsInt, Min } from 'class-validator';

export class UpdateUnitDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsInt()
  @Min(1, { message: 'conversionValue must be greater than 0' })
  conversionValue?: number;
}
