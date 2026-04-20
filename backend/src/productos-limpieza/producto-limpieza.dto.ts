import {
  IsInt,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateProductoLimpiezaDto {
  @IsOptional() @IsInt() sedeId?: number;
  @IsString() nombre: string;
  @IsOptional() @IsString() descripcion?: string;
  @IsOptional() @IsInt() stock?: number;
  @IsOptional() @IsInt() stockMinimo?: number;
  @IsOptional() @IsString() unidad?: string;
}

export class UpdateProductoLimpiezaDto {
  @IsOptional() @IsString() nombre?: string;
  @IsOptional() @IsString() descripcion?: string;
  @IsOptional() @IsInt() stockMinimo?: number;
  @IsOptional() @IsString() unidad?: string;
}

export class AjusteStockLimpiezaDto {
  @IsInt() cantidad: number;
  @IsOptional() @IsString() motivo?: string;
}
