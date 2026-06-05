import { IsString, IsNotEmpty, IsInt, Min } from 'class-validator';

export class CreateUnitDto {
  @IsString()
  @IsNotEmpty({ message: 'Name is required' })
  name: string;

  @IsInt()
  @Min(1, { message: 'conversionValue must be greater than 0' })
  conversionValue: number;
}
