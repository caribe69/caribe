import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateSedeDto {
  @IsString()
  @MaxLength(120)
  nombre: string;

  @IsOptional() @IsString() direccion?: string;
  @IsOptional() @IsString() telefono?: string;

  @IsOptional() @Type(() => Number) @IsNumber() @Min(-90)  @Max(90)  latitud?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(-180) @Max(180) longitud?: number;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(5) estrellas?: number;
}

export class UpdateSedeDto {
  @IsOptional() @IsString() nombre?: string;
  @IsOptional() @IsString() direccion?: string;
  @IsOptional() @IsString() telefono?: string;
  @IsOptional() @IsBoolean() activa?: boolean;

  @IsOptional() @Type(() => Number) @IsNumber() @Min(-90)  @Max(90)  latitud?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(-180) @Max(180) longitud?: number;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(5) estrellas?: number;
}
