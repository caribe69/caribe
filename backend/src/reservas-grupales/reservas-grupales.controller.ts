import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Rol } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtPayload } from '../auth/auth.service';
import { ReservasGrupalesService } from './reservas-grupales.service';
import {
  AsignarHuespedDto,
  CreateReservaGrupalDto,
} from './reserva-grupal.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('reservas-grupales')
export class ReservasGrupalesController {
  constructor(private readonly service: ReservasGrupalesService) {}

  @Roles(Rol.SUPERADMIN, Rol.ADMIN_SEDE, Rol.HOTELERO, Rol.CAJERO)
  @Get()
  findAll(@CurrentUser() user: JwtPayload) {
    return this.service.findAll(user);
  }

  @Roles(Rol.SUPERADMIN, Rol.ADMIN_SEDE, Rol.HOTELERO, Rol.CAJERO)
  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.findOne(id, user);
  }

  @Roles(Rol.SUPERADMIN, Rol.ADMIN_SEDE, Rol.HOTELERO, Rol.CAJERO)
  @Post()
  create(
    @Body() dto: CreateReservaGrupalDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.create(dto, user);
  }

  @Roles(Rol.SUPERADMIN, Rol.ADMIN_SEDE, Rol.HOTELERO, Rol.CAJERO)
  @Patch(':id/huesped')
  asignarHuesped(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AsignarHuespedDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.asignarHuesped(id, dto, user);
  }

  @Roles(Rol.SUPERADMIN, Rol.ADMIN_SEDE, Rol.HOTELERO, Rol.CAJERO)
  @Patch(':id/finalizar')
  finalizar(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.finalizar(id, user);
  }
}
