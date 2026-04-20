import { MetodoPago } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class ItemVentaDto {
  @IsInt() productoId: number;
  @Type(() => Number) @IsInt() @Min(1) cantidad: number;
}

export class CreateVentaDto {
  @IsOptional() @IsInt() sedeId?: number;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ItemVentaDto)
  items: ItemVentaDto[];

  @IsEnum(MetodoPago) metodoPago: MetodoPago;
  @IsOptional() @IsString() notas?: string;
}

export class AnularVentaDto {
  @IsString() @MinLength(3) motivo: string;
}
