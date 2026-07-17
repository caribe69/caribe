import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { Rol } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtPayload } from '../auth/auth.service';
import { ClientesService } from './clientes.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Rol.SUPERADMIN, Rol.ADMIN_SEDE)
@Controller('clientes')
export class ClientesController {
  constructor(private readonly service: ClientesService) {}

  /** Busca clientes por DNI o nombre. */
  @Get('buscar')
  buscar(
    @CurrentUser() user: JwtPayload,
    @Query('q') q: string,
    @Query('sedeId') sedeId?: string,
  ) {
    return this.service.buscar(user, q, sedeId ? Number(sedeId) : undefined);
  }

  /** Detalle e historial de un cliente. */
  @Get(':dni')
  detalle(
    @CurrentUser() user: JwtPayload,
    @Param('dni') dni: string,
    @Query('sedeId') sedeId?: string,
  ) {
    return this.service.detalle(user, dni, sedeId ? Number(sedeId) : undefined);
  }
}
