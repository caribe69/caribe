import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Rol } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtPayload } from '../auth/auth.service';
import { CajaService } from './caja.service';
import { IsOptional, IsInt, IsString } from 'class-validator';

class AbrirTurnoDto {
  @IsOptional() @IsInt() sedeId?: number;
}
class CerrarTurnoDto {
  @IsOptional() @IsString() notas?: string;
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('caja')
export class CajaController {
  constructor(private readonly service: CajaService) {}

  @Get('mi-turno')
  miTurno(@CurrentUser() user: JwtPayload) {
    return this.service.turnoAbierto(user);
  }

  @Roles(Rol.SUPERADMIN, Rol.ADMIN_SEDE, Rol.CAJERO, Rol.HOTELERO)
  @Post('abrir')
  abrir(@Body() dto: AbrirTurnoDto, @CurrentUser() user: JwtPayload) {
    return this.service.abrir(user, dto.sedeId);
  }

  @Roles(Rol.SUPERADMIN, Rol.ADMIN_SEDE, Rol.CAJERO, Rol.HOTELERO)
  @Patch(':id/cerrar')
  cerrar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CerrarTurnoDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.cerrar(id, user, dto?.notas);
  }

  @Get(':id/reporte')
  reporte(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.reporte(id, user);
  }

  // Cualquier rol autenticado: ADMIN ve todos de la sede, resto solo los suyos
  @Get('turnos')
  listar(
    @CurrentUser() user: JwtPayload,
    @Query('sedeId') sedeId?: string,
  ) {
    return this.service.listarTurnos(
      user,
      sedeId ? Number(sedeId) : undefined,
    );
  }

  @Get('estadisticas')
  estadisticas(
    @CurrentUser() user: JwtPayload,
    @Query('sedeId') sedeId?: string,
  ) {
    return this.service.estadisticas(
      user,
      sedeId ? Number(sedeId) : undefined,
    );
  }
}
