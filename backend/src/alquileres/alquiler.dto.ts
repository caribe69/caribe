import { MetodoPago } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsBoolean,
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
  @IsOptional() @IsDateString() clienteFechaNacimiento?: string;

  @IsDateString() fechaIngreso: string;
  @IsDateString() fechaSalida: string;

  @Type(() => Number) @IsNumber() precioHabitacion: number;
  @IsEnum(MetodoPago) metodoPago: MetodoPago;
  @IsOptional() @IsString() notas?: string;

  // Si false → alquiler a crédito/pendiente. Default true (pago inmediato).
  @IsOptional() @IsBoolean() pagado?: boolean;
  @IsOptional() @IsBoolean() amenitiesEntregados?: boolean;

  // Datos fiscales opcionales al crear (si ya viene como factura)
  @IsOptional() @IsEnum({ BOLETA: 'BOLETA', FACTURA: 'FACTURA' } as const)
  tipoComprobante?: 'BOLETA' | 'FACTURA';
  @IsOptional() @IsString() clienteRuc?: string;
  @IsOptional() @IsString() clienteRazonSocial?: string;
  @IsOptional() @IsString() clienteDireccionFiscal?: string;
}

export class AmenitiesDto {
  @IsBoolean() entregados: boolean;
  @IsOptional() @IsString() notas?: string;
}

export class DatosFiscalesDto {
  @IsEnum({ BOLETA: 'BOLETA', FACTURA: 'FACTURA' } as const)
  tipoComprobante: 'BOLETA' | 'FACTURA';

  @IsOptional() @IsString() ruc?: string;
  @IsOptional() @IsString() razonSocial?: string;
  @IsOptional() @IsString() direccionFiscal?: string;
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

  /** Precio manual opcional que sobreescribe el calculado automático */
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) costoManual?: number;
}
