import { MetodoPago } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class CortesiaInput {
  @Type(() => Number) @IsInt() productoId!: number;
  @Type(() => Number) @IsInt() @Min(1) cantidad!: number;
}

export class ImplementoInput {
  @Type(() => Number) @IsInt() implementoId!: number;
  @Type(() => Number) @IsInt() @Min(1) cantidad!: number;
}

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
  @IsOptional() @IsBoolean() conCochera?: boolean;
  // Cómo llegó el huésped: 'PIE' o 'VEHICULO'.
  @IsOptional() @IsString() modoLlegada?: string;

  // Datos fiscales opcionales al crear (si ya viene como factura)
  @IsOptional() @IsEnum({ BOLETA: 'BOLETA', FACTURA: 'FACTURA' } as const)
  tipoComprobante?: 'BOLETA' | 'FACTURA';
  // RUC peruano: 11 dígitos exactos empezando por 10/15/17/20.
  // Si pasa la validación se puede emitir factura sin que SUNAT rechace.
  @IsOptional() @IsString() @Matches(/^(10|15|17|20)\d{9}$/, {
    message: 'RUC inválido (11 dígitos, debe empezar con 10/15/17/20)',
  })
  clienteRuc?: string;
  @IsOptional() @IsString() @MinLength(3) clienteRazonSocial?: string;
  @IsOptional() @IsString() clienteDireccionFiscal?: string;

  /// Intención de emitir comprobante electrónico SUNAT al final del flujo.
  /// El frontend exige confirmación tipeada antes de marcar esto en true.
  @IsOptional() @IsBoolean() deseaEmitirSunat?: boolean;

  /// Productos de cortesía a entregar al alquiler (descuentan stock, no cobran).
  @IsOptional() @IsArray() @ValidateNested({ each: true })
  @Type(() => CortesiaInput) cortesias?: CortesiaInput[];

  /// Implementos prestados (toallas, controles, etc.) — vuelven al finalizar.
  @IsOptional() @IsArray() @ValidateNested({ each: true })
  @Type(() => ImplementoInput) implementos?: ImplementoInput[];

  /// Si este alquiler es el check-in de una reserva, su id. Marca la reserva
  /// como CUMPLIDA y registra su adelanto como pago parcial.
  @IsOptional() @Type(() => Number) @IsInt() reservaId?: number;
}

export class AmenitiesDto {
  @IsBoolean() entregados: boolean;
  @IsOptional() @IsString() notas?: string;
}

export class CobrarDto {
  /** Monto a cobrar ahora. Si no viene, cobra el saldo completo pendiente. */
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  monto?: number;
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
