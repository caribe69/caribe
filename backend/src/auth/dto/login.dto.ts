import { IsInt, IsOptional, IsString, MinLength } from 'class-validator';
import { Type } from 'class-transformer';

export class LoginDto {
  @IsString()
  username: string;

  @IsString()
  @MinLength(6)
  password: string;

  /// Sede elegida en el login (solo para cuentas multisede). Si la cuenta
  /// tiene acceso a varias sedes, es obligatoria y debe estar entre las suyas.
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sedeId?: number;
}

export class LoginOptionsDto {
  @IsString()
  username: string;
}
