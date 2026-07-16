import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateCategoriaProductoDto {
  @IsOptional() @IsInt() sedeId?: number;
  @IsString() @MinLength(1) nombre: string;
  @IsOptional() @Type(() => Number) @IsInt() orden?: number;
}

export class UpdateCategoriaProductoDto {
  @IsOptional() @IsString() @MinLength(1) nombre?: string;
  @IsOptional() @Type(() => Number) @IsInt() orden?: number;
}
