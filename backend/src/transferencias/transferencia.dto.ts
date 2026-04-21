import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class TransferenciaItemDto {
  @IsInt() productoOrigenId: number;
  @Type(() => Number) @IsInt() @Min(1) cantidad: number;
}

export class CreateTransferenciaDto {
  @IsInt() sedeDestinoId: number;
  @IsOptional() @IsString() notas?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => TransferenciaItemDto)
  items: TransferenciaItemDto[];
}

export class RechazarTransferenciaDto {
  @IsString() @MinLength(3) motivo: string;
}
