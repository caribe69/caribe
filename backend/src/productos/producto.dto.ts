import { Type } from 'class-transformer';
import {
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateProductoDto {
  @IsOptional() @IsInt() sedeId?: number;
  @IsString() nombre: string;
  @IsOptional() @IsString() descripcion?: string;
  @Type(() => Number) @IsNumber() precio: number;
  @IsOptional() @IsInt() stock?: number;
  @IsOptional() @IsInt() stockMinimo?: number;
}

export class UpdateProductoDto {
  @IsOptional() @IsString() nombre?: string;
  @IsOptional() @IsString() descripcion?: string;
  @IsOptional() @Type(() => Number) @IsNumber() precio?: number;
  @IsOptional() @IsInt() stockMinimo?: number;
}

export class AjusteStockDto {
  @IsInt() cantidad: number;
  @IsOptional() @IsString() motivo?: string;
}
