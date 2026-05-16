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
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { EstadoImplementoUnidad, Rol } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtPayload } from '../auth/auth.service';
import { ImplementosService } from './implementos.service';

// ───────── DTOs ─────────

class CrearTipoDto {
  @IsString() nombre!: string;
  @IsOptional() @IsString() icono?: string;
  @IsOptional() @IsString() color?: string;
  @IsOptional() @Type(() => Number) @IsInt() sedeId?: number;
}

class UpdateTipoDto {
  @IsOptional() @IsString() nombre?: string;
  @IsOptional() @IsString() icono?: string;
  @IsOptional() @IsString() color?: string;
  @IsOptional() @IsBoolean() activo?: boolean;
}

class CrearUnidadDto {
  @Type(() => Number) @IsInt() @Min(1) tipoId!: number;
  @IsString() codigo!: string;
  /** Opcional: si no se pasa, la unidad queda SIN_ASIGNAR en el almacén */
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) habitacionId?: number;
  @IsOptional() @IsString() notas?: string;
}

class UpdateUnidadDto {
  @IsOptional() @Type(() => Number) @IsInt() habitacionId?: number;
  @IsOptional() @IsString() notas?: string;
  @IsOptional() @IsBoolean() activo?: boolean;
}

class AsignarHabitacionDto {
  /** null o número. Si null/omitido: desasigna (vuelve a SIN_ASIGNAR). */
  @IsOptional() @Type(() => Number) @IsInt() habitacionId?: number | null;
}

class MarcarLavanderiaDto {
  @IsArray() @ArrayNotEmpty() @Type(() => Number) @IsInt({ each: true })
  unidadIds!: number[];
  @IsOptional() @Type(() => Number) @IsInt() tareaLimpiezaId?: number;
  @IsOptional() @IsString() notas?: string;
}

class RetornarLavanderiaDto {
  @IsArray() @ArrayNotEmpty() @Type(() => Number) @IsInt({ each: true })
  unidadIds!: number[];
  @IsOptional() @IsString() notas?: string;
}

class MarcarLavadoDto {
  @IsArray() @ArrayNotEmpty() @Type(() => Number) @IsInt({ each: true })
  unidadIds!: number[];
  @IsOptional() @IsString() notas?: string;
}

class EntregarHabitacionesDto {
  @IsArray() @ArrayNotEmpty() @Type(() => Number) @IsInt({ each: true })
  unidadIds!: number[];
  @IsOptional() @IsString() notas?: string;
}

class MarcarPerdidoDto {
  @IsOptional() @IsString() notas?: string;
}

// ───────── Controller ─────────

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('implementos')
export class ImplementosController {
  constructor(private readonly service: ImplementosService) {}

  // ─── Tipos ───

  @Get('tipos')
  listarTipos(
    @CurrentUser() user: JwtPayload,
    @Query('sedeId') sedeIdQuery?: string,
  ) {
    return this.service.listarTipos(
      user,
      sedeIdQuery ? Number(sedeIdQuery) : undefined,
    );
  }

  @Roles(Rol.SUPERADMIN, Rol.ADMIN_SEDE)
  @Post('tipos')
  crearTipo(@Body() dto: CrearTipoDto, @CurrentUser() user: JwtPayload) {
    return this.service.crearTipo(dto, user);
  }

  @Roles(Rol.SUPERADMIN, Rol.ADMIN_SEDE)
  @Patch('tipos/:id')
  actualizarTipo(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTipoDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.actualizarTipo(id, dto, user);
  }

  @Roles(Rol.SUPERADMIN, Rol.ADMIN_SEDE)
  @Delete('tipos/:id')
  eliminarTipo(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.eliminarTipo(id, user);
  }

  // ─── Unidades ───

  /** Resumen agregado por estado (para el dashboard de "control total") */
  @Get('resumen')
  resumen(
    @CurrentUser() user: JwtPayload,
    @Query('sedeId') sedeIdQuery?: string,
  ) {
    return this.service.resumen(
      user,
      sedeIdQuery ? Number(sedeIdQuery) : undefined,
    );
  }

  @Get()
  listarUnidades(
    @CurrentUser() user: JwtPayload,
    @Query('sedeId') sedeIdQuery?: string,
    @Query('habitacionId') habitacionId?: string,
    @Query('estado') estado?: EstadoImplementoUnidad,
    @Query('tipoId') tipoId?: string,
  ) {
    return this.service.listarUnidades(user, {
      sedeId: sedeIdQuery ? Number(sedeIdQuery) : undefined,
      habitacionId: habitacionId ? Number(habitacionId) : undefined,
      estado,
      tipoId: tipoId ? Number(tipoId) : undefined,
    });
  }

  /** Asigna una unidad a una habitación (o la desasigna pasando null) */
  @Roles(Rol.SUPERADMIN, Rol.ADMIN_SEDE, Rol.HOTELERO)
  @Patch(':id/asignar-habitacion')
  asignarAHabitacion(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AsignarHabitacionDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.asignarAHabitacion(
      id,
      { habitacionId: dto.habitacionId ?? null },
      user,
    );
  }

  @Roles(Rol.SUPERADMIN, Rol.ADMIN_SEDE)
  @Post()
  crearUnidad(@Body() dto: CrearUnidadDto, @CurrentUser() user: JwtPayload) {
    return this.service.crearUnidad(dto, user);
  }

  @Roles(Rol.SUPERADMIN, Rol.ADMIN_SEDE)
  @Patch(':id')
  actualizarUnidad(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUnidadDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.actualizarUnidad(id, dto, user);
  }

  @Roles(Rol.SUPERADMIN, Rol.ADMIN_SEDE)
  @Delete(':id')
  eliminarUnidad(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.eliminarUnidad(id, user);
  }

  // ─── Cambios de estado ───

  /** Limpieza marca unidades como EN_LAVANDERIA */
  @Roles(Rol.SUPERADMIN, Rol.ADMIN_SEDE, Rol.HOTELERO, Rol.LIMPIEZA)
  @Post('marcar-lavanderia')
  marcarLavanderia(
    @Body() dto: MarcarLavanderiaDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.marcarALavanderia(
      dto.unidadIds,
      user,
      dto.tareaLimpiezaId,
      dto.notas,
    );
  }

  /** Admin/hotelero marca que las unidades volvieron limpias */
  @Roles(Rol.SUPERADMIN, Rol.ADMIN_SEDE, Rol.HOTELERO)
  @Post('retornar-lavanderia')
  retornarLavanderia(
    @Body() dto: RetornarLavanderiaDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.retornarDeLavanderia(dto.unidadIds, user, dto.notas);
  }

  // ─── Lavandería (rol LAVANDERIA + admin) ───

  @Roles(Rol.SUPERADMIN, Rol.ADMIN_SEDE, Rol.HOTELERO, Rol.LAVANDERIA)
  @Post('marcar-lavado')
  marcarComoLavado(
    @Body() dto: MarcarLavadoDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.marcarComoLavado(dto.unidadIds, user, dto.notas);
  }

  @Roles(Rol.SUPERADMIN, Rol.ADMIN_SEDE, Rol.HOTELERO, Rol.LAVANDERIA)
  @Post('entregar-habitaciones')
  entregarAHabitaciones(
    @Body() dto: EntregarHabitacionesDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.entregarAHabitaciones(dto.unidadIds, user, dto.notas);
  }

  @Roles(Rol.SUPERADMIN, Rol.ADMIN_SEDE, Rol.HOTELERO, Rol.LAVANDERIA)
  @Get('estadisticas-lavanderia')
  estadisticasLavanderia(@CurrentUser() user: JwtPayload) {
    return this.service.estadisticasLavanderia(user);
  }

  @Roles(Rol.SUPERADMIN, Rol.ADMIN_SEDE, Rol.HOTELERO)
  @Post(':id/perdido')
  marcarPerdido(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: MarcarPerdidoDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.marcarPerdido(id, user, dto.notas);
  }

  @Get(':id/historial')
  historial(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.historialUnidad(id, user);
  }
}
