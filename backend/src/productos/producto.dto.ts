import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateProductoDto {
  @IsOptional() @IsInt() sedeId?: number;
  @IsInt() categoriaId: number;
  @IsString() nombre: string;
  @IsOptional() @IsString() descripcion?: string;
  @Type(() => Number) @IsNumber() precio: number;
  @IsOptional() @IsInt() stock?: number;
  @IsOptional() @IsInt() stockMinimo?: number;
  @IsOptional() @IsBoolean() esCortesia?: boolean;
  @IsOptional() @Type(() => Number) @IsInt() cortesiaCantidad?: number;
}

export class UpdateProductoDto {
  @IsOptional() @IsInt() categoriaId?: number;
  @IsOptional() @IsString() nombre?: string;
  @IsOptional() @IsString() descripcion?: string;
  @IsOptional() @Type(() => Number) @IsNumber() precio?: number;
  @IsOptional() @IsInt() stockMinimo?: number;
  @IsOptional() @IsBoolean() esCortesia?: boolean;
  @IsOptional() @Type(() => Number) @IsInt() cortesiaCantidad?: number;
}

export class AjusteStockDto {
  @IsInt() cantidad: number;
  @IsOptional() @IsString() motivo?: string;
}
