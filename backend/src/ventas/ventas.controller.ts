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
import { EstadoVenta, Rol } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtPayload } from '../auth/auth.service';
import { VentasService } from './ventas.service';
import { AnularVentaDto, CreateVentaDto } from './venta.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('ventas')
export class VentasController {
  constructor(private readonly service: VentasService) {}

  @Get()
  findAll(
    @CurrentUser() user: JwtPayload,
    @Query('sedeId') sedeId?: string,
    @Query('estado') estado?: EstadoVenta,
  ) {
    return this.service.findAll(
      user,
      sedeId ? Number(sedeId) : undefined,
      estado,
    );
  }

  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.findOne(id, user);
  }

  @Roles(Rol.SUPERADMIN, Rol.ADMIN_SEDE, Rol.HOTELERO, Rol.CAJERO)
  @Post()
  create(@Body() dto: CreateVentaDto, @CurrentUser() user: JwtPayload) {
    return this.service.create(dto, user);
  }

  @Roles(Rol.SUPERADMIN, Rol.ADMIN_SEDE, Rol.HOTELERO, Rol.CAJERO)
  @Patch(':id/anular')
  anular(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AnularVentaDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.anular(id, dto, user);
  }
}
