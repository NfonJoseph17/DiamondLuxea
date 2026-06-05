import { IsEmail, IsString, MinLength, IsEnum, IsOptional } from 'class-validator';
import { Role } from '../../common/constants/roles';

export class RegisterDto {
  @IsString()
  @MinLength(2)
  fullName: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsOptional()
  @IsEnum(Role)
  role?: Role;
}
