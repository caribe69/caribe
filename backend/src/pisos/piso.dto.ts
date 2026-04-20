import { IsInt, IsOptional, IsString } from 'class-validator';

export class CreatePisoDto {
  @IsOptional() @IsInt() sedeId?: number;
  @IsInt() numero: number;
  @IsOptional() @IsString() nombre?: string;
}

export class UpdatePisoDto {
  @IsOptional() @IsInt() numero?: number;
  @IsOptional() @IsString() nombre?: string;
}
