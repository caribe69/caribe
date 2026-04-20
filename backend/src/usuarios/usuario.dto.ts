import { Rol } from '@prisma/client';
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class CreateUsuarioDto {
  @IsString() nombre: string;
  @IsString() username: string;
  @IsOptional() @IsEmail() email?: string;
  @IsString() @MinLength(6) password: string;
  @IsEnum(Rol) rol: Rol;
  @IsOptional() @IsInt() sedeId?: number;
}

export class UpdateUsuarioDto {
  @IsOptional() @IsString() nombre?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() @MinLength(6) password?: string;
  @IsOptional() @IsEnum(Rol) rol?: Rol;
  @IsOptional() @IsBoolean() activo?: boolean;
}
