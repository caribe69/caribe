import { MetodoPago } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class HuespedDto {
  @IsInt() habitacionId: number;
  @IsOptional() @IsString() nombre?: string;
  @IsOptional() @IsString() dni?: string;
  @IsOptional() @IsString() telefono?: string;
}

export class CreateReservaGrupalDto {
  @IsOptional() @IsInt() sedeId?: number;

  @IsArray()
  @ArrayMinSize(1)
  @IsInt({ each: true })
  habitacionIds: number[];

  @IsString() @MinLength(11) clienteRuc: string;
  @IsString() @MinLength(3) clienteRazonSocial: string;
  @IsOptional() @IsString() clienteDireccionFiscal?: string;
  @IsOptional() @IsString() contactoNombre?: string;
  @IsOptional() @IsString() contactoTelefono?: string;

  @IsDateString() fechaIngreso: string;
  @IsDateString() fechaSalida: string;

  @Type(() => Number) @IsNumber() precioPorHabitacion: number;
  @IsEnum(MetodoPago) metodoPago: MetodoPago;
  @IsOptional() @IsString() notas?: string;

  // Huéspedes opcionales (por habitación)
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => HuespedDto)
  huespedes?: HuespedDto[];
}

export class AsignarHuespedDto {
  @IsInt() alquilerId: number;
  @IsOptional() @IsString() nombre?: string;
  @IsOptional() @IsString() dni?: string;
  @IsOptional() @IsString() telefono?: string;
  @IsOptional() @IsDateString() fechaNacimiento?: string;
}
