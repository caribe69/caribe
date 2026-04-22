import {
  Body,
  Controller,
  Get,
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
import * as ExcelJS from 'exceljs';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtPayload } from '../auth/auth.service';
import { AlquileresService } from './alquileres.service';
import {
  AgregarConsumoDto,
  AmenitiesDto,
  AnularAlquilerDto,
  CreateAlquilerDto,
  DatosFiscalesDto,
  ExtenderAlquilerDto,
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

  @Get('ruc/buscar')
  buscarRuc(
    @CurrentUser() user: JwtPayload,
    @Query('ruc') ruc: string,
  ) {
    return this.service.buscarRuc(user, ruc);
  }

  @Roles(Rol.SUPERADMIN, Rol.ADMIN_SEDE, Rol.HOTELERO, Rol.CAJERO)
  @Patch(':id/datos-fiscales')
  actualizarDatosFiscales(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: DatosFiscalesDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.actualizarDatosFiscales(id, dto, user);
  }

  @Get('clientes/buscar')
  buscarCliente(
    @CurrentUser() user: JwtPayload,
    @Query('dni') dni: string,
  ) {
    return this.service.buscarCliente(user, dni);
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
  async historialExcel(
    @CurrentUser() user: JwtPayload,
    @Res() res: Response,
    @Query('desde') desde?: string,
    @Query('hasta') hasta?: string,
    @Query('sedeId') sedeId?: string,
  ) {
    const items: any[] = await this.service.historial(
      user,
      desde,
      hasta,
      sedeId ? Number(sedeId) : undefined,
    );

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Caribe Hotel System';
    workbook.created = new Date();
    const sheet = workbook.addWorksheet('Alquileres', {
      views: [{ state: 'frozen', ySplit: 5 }],
    });

    // ---------- Título y rango ----------
    const sedeNombre =
      items[0]?.sede?.nombre ||
      (sedeId ? `Sede #${sedeId}` : 'Todas las sedes');

    sheet.mergeCells('A1:T1');
    const titleCell = sheet.getCell('A1');
    titleCell.value = 'CARIBE HOTEL · Reporte de alquileres';
    titleCell.font = { name: 'Calibri', size: 18, bold: true, color: { argb: 'FFFFFFFF' } };
    titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
    titleCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF6D28D9' },
    };
    sheet.getRow(1).height = 32;

    sheet.mergeCells('A2:T2');
    const subCell = sheet.getCell('A2');
    subCell.value = `${sedeNombre}  ·  Rango: ${desde || '—'} → ${hasta || '—'}  ·  Generado: ${new Date().toLocaleString('es-PE')}`;
    subCell.font = { name: 'Calibri', size: 11, color: { argb: 'FFEDE9FE' }, italic: true };
    subCell.alignment = { vertical: 'middle', horizontal: 'center' };
    subCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF7C3AED' },
    };
    sheet.getRow(2).height = 22;

    sheet.mergeCells('A3:T3');
    const kpiCell = sheet.getCell('A3');
    const totalIngresos = items
      .filter((a) => a.estado !== 'ANULADO')
      .reduce((s, a) => s + Number(a.total), 0);
    const anulados = items.filter((a) => a.estado === 'ANULADO').length;
    kpiCell.value = `Alquileres: ${items.length}    ·    Ingresos: S/ ${totalIngresos.toFixed(2)}    ·    Anulados: ${anulados}`;
    kpiCell.font = { name: 'Calibri', size: 10, color: { argb: 'FF475569' } };
    kpiCell.alignment = { vertical: 'middle', horizontal: 'center' };
    kpiCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF1F5F9' },
    };
    sheet.getRow(3).height = 20;

    // Fila en blanco (4) separadora
    sheet.getRow(4).height = 6;

    // ---------- Header columnas ----------
    const columns = [
      { header: 'ID', key: 'id', width: 8 },
      { header: 'Fecha', key: 'fecha', width: 12 },
      { header: 'Hora', key: 'hora', width: 10 },
      { header: 'Sede', key: 'sede', width: 22 },
      { header: 'Habitación', key: 'habitacion', width: 12 },
      { header: 'Piso', key: 'piso', width: 7 },
      { header: 'Cliente', key: 'cliente', width: 28 },
      { header: 'DNI', key: 'dni', width: 12 },
      { header: 'Fecha nacimiento', key: 'fechaNac', width: 14 },
      { header: 'Edad', key: 'edad', width: 7 },
      { header: 'Teléfono', key: 'telefono', width: 14 },
      { header: 'Tipo comp.', key: 'tipoComp', width: 11 },
      { header: 'RUC', key: 'ruc', width: 14 },
      { header: 'Razón social', key: 'razonSocial', width: 28 },
      { header: 'Ingreso', key: 'ingreso', width: 18 },
      { header: 'Salida', key: 'salida', width: 18 },
      { header: 'Salida real', key: 'salidaReal', width: 18 },
      { header: 'Precio hab.', key: 'precioHab', width: 12 },
      { header: 'Productos S/', key: 'totalProd', width: 13 },
      { header: 'Total S/', key: 'total', width: 12 },
      { header: 'Método', key: 'metodo', width: 12 },
      { header: 'Estado', key: 'estado', width: 12 },
      { header: 'Motivo anulación', key: 'motivo', width: 24 },
      { header: 'Creado por', key: 'creadoPor', width: 20 },
      { header: 'Productos consumidos', key: 'productos', width: 40 },
    ];
    // Escribimos headers en fila 5
    columns.forEach((c, i) => {
      const cell = sheet.getCell(5, i + 1);
      cell.value = c.header;
      sheet.getColumn(i + 1).width = c.width;
    });
    const headerRow = sheet.getRow(5);
    headerRow.height = 26;
    headerRow.eachCell((cell) => {
      cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF4C1D95' },
      };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF6D28D9' } },
        bottom: { style: 'medium', color: { argb: 'FF4C1D95' } },
      };
    });

    // ---------- Filas de datos ----------
    let rowIdx = 6;
    for (const a of items) {
      const fechaCreado = new Date(a.creadoEn);
      const productosStr = a.consumos
        .map((c: any) => `${c.producto.nombre} ×${c.cantidad}`)
        .join(' · ');
      const row = sheet.getRow(rowIdx);
      // Calcular edad si hay fecha de nacimiento
      let edad: number | '' = '';
      let fechaNacStr = '';
      if ((a as any).clienteFechaNacimiento) {
        const nac = new Date((a as any).clienteFechaNacimiento);
        fechaNacStr = nac.toLocaleDateString('es-PE');
        const hoy = new Date();
        let e = hoy.getFullYear() - nac.getFullYear();
        const antes =
          hoy.getMonth() < nac.getMonth() ||
          (hoy.getMonth() === nac.getMonth() && hoy.getDate() < nac.getDate());
        if (antes) e -= 1;
        edad = e;
      }

      row.values = [
        a.id,
        fechaCreado.toLocaleDateString('es-PE'),
        fechaCreado.toLocaleTimeString('es-PE', {
          hour: '2-digit',
          minute: '2-digit',
        }),
        a.sede?.nombre || '',
        a.habitacion?.numero || '',
        a.habitacion?.piso?.numero || '',
        a.clienteNombre,
        a.clienteDni,
        fechaNacStr,
        edad,
        a.clienteTelefono || '',
        (a as any).tipoComprobante || 'BOLETA',
        (a as any).clienteRuc || '',
        (a as any).clienteRazonSocial || '',
        new Date(a.fechaIngreso).toLocaleString('es-PE'),
        new Date(a.fechaSalida).toLocaleString('es-PE'),
        a.fechaSalidaReal
          ? new Date(a.fechaSalidaReal).toLocaleString('es-PE')
          : '',
        Number(a.precioHabitacion),
        Number(a.totalProductos),
        Number(a.total),
        a.metodoPago,
        a.estado,
        a.motivoAnulacion || '',
        a.creadoPor?.nombre || '',
        productosStr,
      ];

      const even = rowIdx % 2 === 0;
      row.eachCell({ includeEmpty: true }, (cell) => {
        cell.font = { name: 'Calibri', size: 10, color: { argb: 'FF1E293B' } };
        cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: false };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: even ? 'FFFAFAFA' : 'FFFFFFFF' },
        };
        cell.border = {
          bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        };
      });

      // Formato de moneda en columnas precio/productos/total
      // (tras agregar fechaNac, edad, tipoComp, RUC, razonSocial, se corrieron)
      const COL_PRECIO = 18;
      const COL_TOTALPROD = 19;
      const COL_TOTAL = 20;
      const COL_ESTADO = 22;
      const COL_EDAD = 10;
      [COL_PRECIO, COL_TOTALPROD, COL_TOTAL].forEach((col) => {
        const c = row.getCell(col);
        c.numFmt = '"S/ "#,##0.00';
        c.alignment = { vertical: 'middle', horizontal: 'right' };
        c.font = { ...c.font, bold: col === COL_TOTAL };
      });
      // Centrar id, piso, habitacion, edad
      [1, 5, 6, COL_EDAD].forEach((col) => {
        row.getCell(col).alignment = { vertical: 'middle', horizontal: 'center' };
      });

      // Colorear estado
      const estadoCell = row.getCell(COL_ESTADO);
      const estadoStyle: Record<string, { bg: string; fg: string }> = {
        ACTIVO: { bg: 'FFD1FAE5', fg: 'FF065F46' },
        FINALIZADO: { bg: 'FFE2E8F0', fg: 'FF334155' },
        ANULADO: { bg: 'FFFEE2E2', fg: 'FF991B1B' },
      };
      const es = estadoStyle[a.estado as string];
      if (es) {
        estadoCell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: es.bg },
        };
        estadoCell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: es.fg } };
        estadoCell.alignment = { vertical: 'middle', horizontal: 'center' };
      }

      row.commit();
      rowIdx++;
    }

    // ---------- Fila de totales ----------
    const totalRow = sheet.getRow(rowIdx);
    totalRow.getCell(17).value = 'TOTAL';
    totalRow.getCell(17).alignment = { vertical: 'middle', horizontal: 'right' };
    const sumPrecio = items
      .filter((a) => a.estado !== 'ANULADO')
      .reduce((s, a) => s + Number(a.precioHabitacion), 0);
    const sumProd = items
      .filter((a) => a.estado !== 'ANULADO')
      .reduce((s, a) => s + Number(a.totalProductos), 0);
    totalRow.getCell(18).value = sumPrecio;
    totalRow.getCell(19).value = sumProd;
    totalRow.getCell(20).value = totalIngresos;
    [18, 19, 20].forEach((col) => {
      const c = totalRow.getCell(col);
      c.numFmt = '"S/ "#,##0.00';
      c.alignment = { vertical: 'middle', horizontal: 'right' };
    });
    totalRow.eachCell({ includeEmpty: false }, (cell) => {
      cell.font = {
        name: 'Calibri',
        size: 11,
        bold: true,
        color: { argb: 'FFFFFFFF' },
      };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF4C1D95' },
      };
      cell.border = {
        top: { style: 'medium', color: { argb: 'FF4C1D95' } },
      };
    });
    totalRow.height = 24;

    // Auto-filter en headers
    sheet.autoFilter = {
      from: { row: 5, column: 1 },
      to: { row: Math.max(5, rowIdx - 1), column: columns.length },
    };

    // ---------- Enviar ----------
    const rangoStr =
      desde && hasta
        ? `${desde}_a_${hasta}`
        : new Date().toISOString().slice(0, 10);
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="alquileres_${rangoStr}.xlsx"`,
    );
    const buffer = await workbook.xlsx.writeBuffer();
    res.send(Buffer.from(buffer));
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
  @Post(':id/cotizar-extension')
  cotizarExtension(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ExtenderAlquilerDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.cotizarExtension(id, dto, user);
  }

  @Roles(Rol.SUPERADMIN, Rol.ADMIN_SEDE, Rol.HOTELERO, Rol.CAJERO)
  @Patch(':id/extender')
  extender(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ExtenderAlquilerDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.extender(id, dto, user);
  }

  @Roles(Rol.SUPERADMIN, Rol.ADMIN_SEDE, Rol.HOTELERO, Rol.CAJERO)
  @Patch(':id/cobrar')
  cobrar(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.marcarPagado(id, user);
  }

  @Roles(Rol.SUPERADMIN, Rol.ADMIN_SEDE, Rol.HOTELERO, Rol.CAJERO)
  @Patch(':id/amenities')
  amenities(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AmenitiesDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.actualizarAmenities(id, dto, user);
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
