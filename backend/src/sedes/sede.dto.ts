import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateSedeDto {
  @IsString()
  @MaxLength(120)
  nombre: string;

  @IsOptional() @IsString() direccion?: string;
  @IsOptional() @IsString() telefono?: string;
}

export class UpdateSedeDto {
  @IsOptional() @IsString() nombre?: string;
  @IsOptional() @IsString() direccion?: string;
  @IsOptional() @IsString() telefono?: string;
  @IsOptional() @IsBoolean() activa?: boolean;
}
