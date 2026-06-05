import { IsNumber, Min } from 'class-validator';

export class UpdatePriceDto {
  @IsNumber()
  @Min(0)
  purchasePrice: number;

  @IsNumber()
  @Min(0)
  retailPrice: number;

  @IsNumber()
  @Min(0)
  wholesalePrice: number;
}
