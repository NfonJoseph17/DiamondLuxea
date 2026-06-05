import { IsString, IsOptional, IsEnum, IsBoolean } from 'class-validator';
import { LocationType } from '../../common/constants/roles';

export class CreateLocationDto {
  @IsString()
  name: string;

  @IsEnum(LocationType)
  type: LocationType;
}

export class UpdateLocationDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEnum(LocationType)
  type?: LocationType;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
