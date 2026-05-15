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
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { Rol } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtPayload } from '../auth/auth.service';
import { ImplementosService } from './implementos.service';

class CrearImplementoDto {
  @IsString() nombre!: string;
  @IsOptional() @IsString() descripcion?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) stockTotal?: number;
  @IsOptional() @Type(() => Number) @IsInt() sedeId?: number;
}

class UpdateImplementoDto {
  @IsOptional() @IsString() nombre?: string;
  @IsOptional() @IsString() descripcion?: string;
  @IsOptional() @IsBoolean() activo?: boolean;
}

class AjusteStockImplementoDto {
  @Type(() => Number) @IsInt() delta!: number;
  @IsOptional() @IsString() motivo?: string;
}

class DevolverDto {
  @IsOptional() @IsString() notas?: string;
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('implementos')
export class ImplementosController {
  constructor(private readonly service: ImplementosService) {}

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

  @Get('asignaciones')
  listarAsignaciones(
    @CurrentUser() user: JwtPayload,
    @Query('alquilerId') alquilerId?: string,
    @Query('pendientes') pendientes?: string,
  ) {
    return this.service.listarAsignaciones({
      alquilerId: alquilerId ? Number(alquilerId) : undefined,
      pendientes: pendientes === 'true',
      sedeId: user.sedeId ?? undefined,
    });
  }

  @Roles(Rol.SUPERADMIN, Rol.ADMIN_SEDE)
  @Post()
  crear(@Body() dto: CrearImplementoDto, @CurrentUser() user: JwtPayload) {
    return this.service.crear(dto, user);
  }

  @Roles(Rol.SUPERADMIN, Rol.ADMIN_SEDE)
  @Patch(':id')
  actualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateImplementoDto,
  ) {
    return this.service.actualizar(id, dto);
  }

  @Roles(Rol.SUPERADMIN, Rol.ADMIN_SEDE)
  @Post(':id/ajuste-stock')
  ajusteStock(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AjusteStockImplementoDto,
  ) {
    return this.service.ajusteStock(id, dto.delta, dto.motivo);
  }

  @Roles(Rol.SUPERADMIN, Rol.ADMIN_SEDE)
  @Delete(':id')
  eliminar(@Param('id', ParseIntPipe) id: number) {
    return this.service.eliminar(id);
  }

  /** Devolver implemento prestado a alquiler (sin tener que cerrar el alquiler) */
  @Roles(Rol.SUPERADMIN, Rol.ADMIN_SEDE, Rol.HOTELERO, Rol.CAJERO)
  @Post('asignaciones/:id/devolver')
  devolver(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: DevolverDto,
  ) {
    return this.service.devolverDeAlquiler(id, dto.notas);
  }
}
