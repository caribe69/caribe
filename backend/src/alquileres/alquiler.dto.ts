import { MetodoPago } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';

export class CreateAlquilerDto {
  @IsOptional() @IsInt() sedeId?: number;
  @IsInt() habitacionId: number;

  @IsString() @MinLength(2) clienteNombre: string;
  @IsString() @MinLength(6) clienteDni: string;
  @IsOptional() @IsString() clienteTelefono?: string;

  @IsDateString() fechaIngreso: string;
  @IsDateString() fechaSalida: string;

  @Type(() => Number) @IsNumber() precioHabitacion: number;
  @IsEnum(MetodoPago) metodoPago: MetodoPago;
  @IsOptional() @IsString() notas?: string;
}

export class AgregarConsumoDto {
  @IsInt() productoId: number;
  @Type(() => Number) @IsInt() @Min(1) cantidad: number;
}

export class FinalizarAlquilerDto {
  @IsOptional() @IsString() notas?: string;
}

export class AnularAlquilerDto {
  @IsString() @MinLength(3) motivo: string;
}

export class ExtenderAlquilerDto {
  @IsEnum({ HORA: 'HORA', DIA: 'DIA' } as const)
  tipo: 'HORA' | 'DIA';

  @Type(() => Number) @IsInt() @Min(1) cantidad: number;
}
