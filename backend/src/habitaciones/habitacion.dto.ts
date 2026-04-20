import { EstadoHabitacion } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateHabitacionDto {
  @IsOptional() @IsInt() sedeId?: number;
  @IsInt() pisoId: number;
  @IsString() numero: string;
  @IsOptional() @IsString() descripcion?: string;
  @IsOptional() @IsString() caracteristicas?: string;
  @Type(() => Number) @IsNumber() precioHora: number;
  @Type(() => Number) @IsNumber() precioNoche: number;
}

export class UpdateHabitacionDto {
  @IsOptional() @IsInt() pisoId?: number;
  @IsOptional() @IsString() numero?: string;
  @IsOptional() @IsString() descripcion?: string;
  @IsOptional() @IsString() caracteristicas?: string;
  @IsOptional() @Type(() => Number) @IsNumber() precioHora?: number;
  @IsOptional() @Type(() => Number) @IsNumber() precioNoche?: number;
}

export class CambiarEstadoDto {
  @IsEnum(EstadoHabitacion) estado: EstadoHabitacion;
}
