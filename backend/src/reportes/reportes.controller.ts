import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { Rol } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtPayload } from '../auth/auth.service';
import { ReportesService } from './reportes.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('reportes')
export class ReportesController {
  constructor(private readonly service: ReportesService) {}

  @Roles(Rol.SUPERADMIN, Rol.ADMIN_SEDE)
  @Get('habitaciones-top')
  habitacionesTop(
    @CurrentUser() user: JwtPayload,
    @Query('desde') desde?: string,
    @Query('hasta') hasta?: string,
    @Query('sedeId') sedeId?: string,
  ) {
    return this.service.habitacionesTop(user, {
      desde,
      hasta,
      sedeId: sedeId ? Number(sedeId) : undefined,
    });
  }

  @Roles(Rol.SUPERADMIN, Rol.ADMIN_SEDE)
  @Get('serie-diaria')
  serieDiaria(
    @CurrentUser() user: JwtPayload,
    @Query('desde') desde?: string,
    @Query('hasta') hasta?: string,
    @Query('sedeId') sedeId?: string,
  ) {
    return this.service.serieDiaria(user, {
      desde,
      hasta,
      sedeId: sedeId ? Number(sedeId) : undefined,
    });
  }

  @Roles(Rol.SUPERADMIN, Rol.ADMIN_SEDE)
  @Get('comparativo-mensual')
  comparativoMensual(
    @CurrentUser() user: JwtPayload,
    @Query('meses') meses?: string,
    @Query('sedeId') sedeId?: string,
  ) {
    return this.service.comparativoMensual(
      user,
      meses ? Number(meses) : 6,
      sedeId ? Number(sedeId) : undefined,
    );
  }

  @Roles(Rol.SUPERADMIN)
  @Get('global')
  global(
    @Query('desde') desde?: string,
    @Query('hasta') hasta?: string,
  ) {
    return this.service.panelGlobal({ desde, hasta });
  }
}
