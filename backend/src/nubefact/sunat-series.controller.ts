import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { Rol, TipoComprobanteSerie } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtPayload } from '../auth/auth.service';
import { SunatSeriesService } from './sunat-series.service';

class CrearSerieDto {
  @Type(() => Number) @IsInt() @Min(1) sedeId!: number;
  @IsEnum(TipoComprobanteSerie) tipo!: TipoComprobanteSerie;
  @IsString() @Length(4, 4) serie!: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(99_999_999)
  ultimoCorrelativo?: number;
  @IsOptional() @IsBoolean() esPredeterminada?: boolean;
  @IsOptional() @IsString() notas?: string;
}

class ActualizarSerieDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(99_999_999)
  ultimoCorrelativo?: number;
  @IsOptional() @IsBoolean() activa?: boolean;
  @IsOptional() @IsBoolean() esPredeterminada?: boolean;
  @IsOptional() @IsString() notas?: string;
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Rol.SUPERADMIN, Rol.ADMIN_SEDE)
@Controller('sunat-series')
export class SunatSeriesController {
  constructor(private readonly service: SunatSeriesService) {}

  @Get()
  listar(
    @CurrentUser() user: JwtPayload,
    @Query('sedeId') sedeIdQuery?: string,
  ) {
    return this.service.listar(
      user,
      sedeIdQuery ? Number(sedeIdQuery) : undefined,
    );
  }

  @Post()
  crear(@CurrentUser() user: JwtPayload, @Body() dto: CrearSerieDto) {
    return this.service.crear(user, dto);
  }

  @Patch(':id')
  actualizar(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ActualizarSerieDto,
  ) {
    return this.service.actualizar(id, user, dto);
  }

  @Delete(':id')
  eliminar(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.service.eliminar(id, user);
  }
}
