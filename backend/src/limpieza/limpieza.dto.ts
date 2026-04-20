import { Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateTareaDto {
  @IsOptional() @IsInt() sedeId?: number;
  @IsInt() habitacionId: number;
  @IsOptional() @IsInt() asignadaAId?: number;
  @IsOptional() @IsString() notas?: string;
}

export class AsignarTareaDto {
  @IsInt() asignadaAId: number;
}

export class RegistrarUsoProductoDto {
  @IsInt() productoId: number;
  @Type(() => Number) @IsInt() @Min(1) cantidad: number;
}

export class CompletarTareaDto {
  @IsOptional() @IsString() notas?: string;
}
