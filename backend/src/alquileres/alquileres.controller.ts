import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { EstadoAlquiler, Rol } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtPayload } from '../auth/auth.service';
import { AlquileresService } from './alquileres.service';
import {
  AgregarConsumoDto,
  AnularAlquilerDto,
  CreateAlquilerDto,
  FinalizarAlquilerDto,
} from './alquiler.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('alquileres')
export class AlquileresController {
  constructor(private readonly service: AlquileresService) {}

  @Get()
  findAll(
    @CurrentUser() user: JwtPayload,
    @Query('sedeId') sedeId?: string,
    @Query('estado') estado?: EstadoAlquiler,
  ) {
    return this.service.findAll(
      user,
      sedeId ? Number(sedeId) : undefined,
      estado,
    );
  }

  @Get('historial')
  historial(
    @CurrentUser() user: JwtPayload,
    @Query('desde') desde?: string,
    @Query('hasta') hasta?: string,
    @Query('sedeId') sedeId?: string,
  ) {
    return this.service.historial(
      user,
      desde,
      hasta,
      sedeId ? Number(sedeId) : undefined,
    );
  }

  @Get('historial/excel')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  async historialExcel(
    @CurrentUser() user: JwtPayload,
    @Res({ passthrough: true }) res: Response,
    @Query('desde') desde?: string,
    @Query('hasta') hasta?: string,
    @Query('sedeId') sedeId?: string,
  ) {
    const items = await this.service.historial(
      user,
      desde,
      hasta,
      sedeId ? Number(sedeId) : undefined,
    );

    const headers = [
      'ID',
      'Fecha creado',
      'Hora',
      'Sede',
      'Habitación',
      'Piso',
      'Cliente',
      'DNI',
      'Teléfono',
      'Ingreso',
      'Salida',
      'Salida real',
      'Precio habitación',
      'Total productos',
      'Total',
      'Método pago',
      'Estado',
      'Motivo anulación',
      'Creado por',
      'Productos',
    ];

    const esc = (v: any) => {
      if (v === null || v === undefined) return '';
      const s = String(v).replace(/"/g, '""');
      if (s.search(/["\n,;]/) >= 0) return `"${s}"`;
      return s;
    };

    const lines = [headers.join(';')];
    for (const a of items as any[]) {
      const fechaCreado = new Date(a.creadoEn);
      const productosStr = a.consumos
        .map((c: any) => `${c.producto.nombre} x${c.cantidad}`)
        .join(' | ');
      const fila = [
        a.id,
        fechaCreado.toLocaleDateString('es-PE'),
        fechaCreado.toLocaleTimeString('es-PE'),
        a.sede?.nombre || '',
        a.habitacion?.numero || '',
        a.habitacion?.piso?.numero || '',
        a.clienteNombre,
        a.clienteDni,
        a.clienteTelefono || '',
        new Date(a.fechaIngreso).toLocaleString('es-PE'),
        new Date(a.fechaSalida).toLocaleString('es-PE'),
        a.fechaSalidaReal
          ? new Date(a.fechaSalidaReal).toLocaleString('es-PE')
          : '',
        Number(a.precioHabitacion).toFixed(2),
        Number(a.totalProductos).toFixed(2),
        Number(a.total).toFixed(2),
        a.metodoPago,
        a.estado,
        a.motivoAnulacion || '',
        a.creadoPor?.nombre || '',
        productosStr,
      ];
      lines.push(fila.map(esc).join(';'));
    }

    const csv = '\uFEFF' + lines.join('\n'); // BOM para que Excel lo abra con UTF-8
    const rangoStr =
      desde && hasta
        ? `${desde}_a_${hasta}`
        : new Date().toISOString().slice(0, 10);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="alquileres_${rangoStr}.csv"`,
    );
    return csv;
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
  create(@Body() dto: CreateAlquilerDto, @CurrentUser() user: JwtPayload) {
    return this.service.create(dto, user);
  }

  @Roles(Rol.SUPERADMIN, Rol.ADMIN_SEDE, Rol.HOTELERO, Rol.CAJERO)
  @Post(':id/consumo')
  agregarConsumo(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AgregarConsumoDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.agregarConsumo(id, dto, user);
  }

  @Roles(Rol.SUPERADMIN, Rol.ADMIN_SEDE, Rol.HOTELERO, Rol.CAJERO)
  @Patch(':id/finalizar')
  finalizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: FinalizarAlquilerDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.finalizar(id, dto, user);
  }

  @Roles(Rol.SUPERADMIN, Rol.ADMIN_SEDE, Rol.HOTELERO, Rol.CAJERO)
  @Patch(':id/anular')
  anular(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AnularAlquilerDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.anular(id, dto, user);
  }
}
