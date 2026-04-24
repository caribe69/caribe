import { Injectable } from '@nestjs/common';
import { EstadoAlquiler } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from '../auth/auth.service';
import { resolveSedeId } from '../common/sede-scope';

interface RangoDto {
  desde?: string;
  hasta?: string;
  sedeId?: number;
}

@Injectable()
export class ReportesService {
  constructor(private prisma: PrismaService) {}

  /** Ranking de habitaciones con más alquileres finalizados en el rango */
  async habitacionesTop(user: JwtPayload, dto: RangoDto) {
    const sedeId = resolveSedeId(user, dto.sedeId);
    const where = this.whereConRango(sedeId, dto, false);

    // groupBy habitacionId
    const grupos = await this.prisma.alquiler.groupBy({
      by: ['habitacionId'],
      where,
      _count: { habitacionId: true },
      _sum: { total: true },
    });

    // Cargar info de habitaciones
    const ids = grupos.map((g) => g.habitacionId);
    const habs = await this.prisma.habitacion.findMany({
      where: { id: { in: ids } },
      include: { piso: true },
    });
    const byId = new Map(habs.map((h) => [h.id, h]));

    const result = grupos
      .map((g) => {
        const h = byId.get(g.habitacionId);
        return {
          habitacionId: g.habitacionId,
          numero: h?.numero ?? String(g.habitacionId),
          pisoNumero: h?.piso?.numero ?? 0,
          descripcion: h?.descripcion ?? null,
          alquileres: g._count.habitacionId,
          ingresos: Number(g._sum.total ?? 0),
        };
      })
      .sort((a, b) => b.alquileres - a.alquileres);

    return result;
  }

  /**
   * Serie temporal por día (o por mes si es rango largo) con cantidad
   * de alquileres finalizados + ingresos
   */
  async serieDiaria(user: JwtPayload, dto: RangoDto) {
    const sedeId = resolveSedeId(user, dto.sedeId);
    const where = this.whereConRango(sedeId, dto, false);

    const alquileres = await this.prisma.alquiler.findMany({
      where,
      select: {
        creadoEn: true,
        total: true,
      },
    });

    // Agrupa por YYYY-MM-DD
    const byDate = new Map<string, { alquileres: number; ingresos: number }>();
    for (const a of alquileres) {
      const key = a.creadoEn.toISOString().slice(0, 10);
      const prev = byDate.get(key) ?? { alquileres: 0, ingresos: 0 };
      prev.alquileres += 1;
      prev.ingresos += Number(a.total);
      byDate.set(key, prev);
    }

    return Array.from(byDate.entries())
      .map(([fecha, v]) => ({ fecha, ...v }))
      .sort((a, b) => (a.fecha < b.fecha ? -1 : 1));
  }

  /**
   * Comparativo mensual: alquileres + ingresos agrupados por mes.
   * Útil para comparar mes vs mes (tendencia).
   */
  async comparativoMensual(user: JwtPayload, meses = 6, sedeIdQuery?: number) {
    const sedeId = resolveSedeId(user, sedeIdQuery);
    const desde = new Date();
    desde.setMonth(desde.getMonth() - meses + 1);
    desde.setDate(1);
    desde.setHours(0, 0, 0, 0);

    const alquileres = await this.prisma.alquiler.findMany({
      where: {
        sedeId,
        estado: EstadoAlquiler.FINALIZADO,
        creadoEn: { gte: desde },
      },
      select: { creadoEn: true, total: true },
    });

    const byMonth = new Map<string, { alquileres: number; ingresos: number }>();
    for (const a of alquileres) {
      const y = a.creadoEn.getFullYear();
      const m = a.creadoEn.getMonth() + 1;
      const key = `${y}-${String(m).padStart(2, '0')}`;
      const prev = byMonth.get(key) ?? { alquileres: 0, ingresos: 0 };
      prev.alquileres += 1;
      prev.ingresos += Number(a.total);
      byMonth.set(key, prev);
    }

    // Asegura todos los meses, incluso los vacíos
    const result: Array<{
      mes: string;
      alquileres: number;
      ingresos: number;
    }> = [];
    const cursor = new Date(desde);
    const hoy = new Date();
    while (cursor <= hoy) {
      const y = cursor.getFullYear();
      const m = cursor.getMonth() + 1;
      const key = `${y}-${String(m).padStart(2, '0')}`;
      const v = byMonth.get(key) ?? { alquileres: 0, ingresos: 0 };
      result.push({ mes: key, ...v });
      cursor.setMonth(cursor.getMonth() + 1);
    }
    return result;
  }

  /**
   * KPIs hoteleros completos para gerencia: ocupación, ADR, RevPAR,
   * ingresos, clientes nuevos/recurrentes, top habitaciones y cajeros.
   */
  async kpisHoteleros(user: JwtPayload, dto: RangoDto) {
    const sedeId = resolveSedeId(user, dto.sedeId);
    const rango = this.rangoFechas(dto) ?? {
      gte: new Date(Date.now() - 30 * 24 * 3600 * 1000),
      lte: new Date(),
    };
    const diasPeriodo = Math.max(
      1,
      Math.ceil(
        (rango.lte.getTime() - rango.gte.getTime()) / (24 * 3600 * 1000),
      ),
    );

    // Inventario de habitaciones
    const [totalHab, activas] = await Promise.all([
      this.prisma.habitacion.count({ where: { sedeId } }),
      this.prisma.habitacion.count({ where: { sedeId, activa: true } }),
    ]);

    // Alquileres del período
    const whereFinalizados = {
      sedeId,
      estado: EstadoAlquiler.FINALIZADO,
      creadoEn: rango,
    };
    const whereAnulados = {
      sedeId,
      estado: EstadoAlquiler.ANULADO,
      creadoEn: rango,
    };
    const whereActivos = {
      sedeId,
      estado: EstadoAlquiler.ACTIVO,
      creadoEn: rango,
    };

    const [finalizados, anulados, activos] = await Promise.all([
      this.prisma.alquiler.findMany({
        where: whereFinalizados,
        select: {
          id: true,
          precioHabitacion: true,
          totalProductos: true,
          total: true,
          clienteDni: true,
          creadoEn: true,
          fechaSalidaReal: true,
          fechaSalida: true,
          habitacionId: true,
          creadoPorId: true,
          creadoPor: { select: { id: true, nombre: true } },
          habitacion: {
            select: { numero: true, piso: { select: { numero: true } } },
          },
        },
      }),
      this.prisma.alquiler.count({ where: whereAnulados }),
      this.prisma.alquiler.count({ where: whereActivos }),
    ]);

    const totalAlquileres = finalizados.length;

    // Ingresos
    const ingresoHab = finalizados.reduce(
      (s, a) => s + Number(a.precioHabitacion),
      0,
    );
    const ingresoProd = finalizados.reduce(
      (s, a) => s + Number(a.totalProductos),
      0,
    );
    const ingresoTotal = ingresoHab + ingresoProd;

    // Noches ocupadas: suma horas reales / 24 por alquiler finalizado
    let totalHoras = 0;
    for (const a of finalizados) {
      const inicio = new Date(a.creadoEn).getTime();
      const fin = new Date(
        a.fechaSalidaReal || a.fechaSalida,
      ).getTime();
      const h = Math.max(0, (fin - inicio) / (3600 * 1000));
      totalHoras += h;
    }
    const nochesOcupadas = totalHoras / 24; // en "noches equivalentes"
    const estadiaPromedioHoras =
      totalAlquileres > 0 ? totalHoras / totalAlquileres : 0;

    // Noches disponibles: días del periodo × habitaciones activas
    const nochesDisponibles = diasPeriodo * (activas || 1);
    const ocupacionPromedioPct =
      nochesDisponibles > 0 ? (nochesOcupadas / nochesDisponibles) * 100 : 0;

    // KPIs hoteleros
    const adr = totalAlquileres > 0 ? ingresoHab / totalAlquileres : 0;
    const revpar = activas > 0 ? ingresoHab / (diasPeriodo * activas) : 0;
    const ticketPromedio =
      totalAlquileres > 0 ? ingresoTotal / totalAlquileres : 0;

    // Clientes nuevos vs recurrentes
    const dnisEnPeriodo = Array.from(
      new Set(finalizados.map((a) => a.clienteDni).filter(Boolean)),
    );
    let clientesNuevos = 0;
    if (dnisEnPeriodo.length > 0) {
      const primeros = await this.prisma.alquiler.groupBy({
        by: ['clienteDni'],
        where: { clienteDni: { in: dnisEnPeriodo } },
        _min: { creadoEn: true },
      });
      for (const p of primeros) {
        if (
          p._min.creadoEn &&
          p._min.creadoEn >= rango.gte &&
          p._min.creadoEn <= rango.lte
        )
          clientesNuevos += 1;
      }
    }
    const clientesRecurrentes = dnisEnPeriodo.length - clientesNuevos;

    // Top habitaciones
    const porHab = new Map<
      number,
      { ingresos: number; alquileres: number }
    >();
    for (const a of finalizados) {
      const cur = porHab.get(a.habitacionId) ?? { ingresos: 0, alquileres: 0 };
      cur.ingresos += Number(a.total);
      cur.alquileres += 1;
      porHab.set(a.habitacionId, cur);
    }
    const habIds = Array.from(porHab.keys());
    const habsInfo =
      habIds.length > 0
        ? await this.prisma.habitacion.findMany({
            where: { id: { in: habIds } },
            include: { piso: true },
          })
        : [];
    const topHabitaciones = habsInfo
      .map((h) => ({
        habitacionId: h.id,
        numero: h.numero,
        pisoNumero: h.piso.numero,
        ...porHab.get(h.id)!,
      }))
      .sort((a, b) => b.ingresos - a.ingresos)
      .slice(0, 10);

    // Top cajeros
    const porCajero = new Map<
      number,
      { nombre: string; ingresos: number; alquileres: number }
    >();
    for (const a of finalizados) {
      const cur = porCajero.get(a.creadoPorId) ?? {
        nombre: a.creadoPor?.nombre || `Usuario ${a.creadoPorId}`,
        ingresos: 0,
        alquileres: 0,
      };
      cur.ingresos += Number(a.total);
      cur.alquileres += 1;
      porCajero.set(a.creadoPorId, cur);
    }
    const topCajeros = Array.from(porCajero.entries())
      .map(([id, v]) => ({ usuarioId: id, ...v }))
      .sort((a, b) => b.ingresos - a.ingresos)
      .slice(0, 10);

    // Ocupación e ingresos por día
    const byDia = new Map<
      string,
      { noches: number; ingresos: number; alquileres: number }
    >();
    for (const a of finalizados) {
      const key = new Date(a.creadoEn).toISOString().slice(0, 10);
      const cur = byDia.get(key) ?? {
        noches: 0,
        ingresos: 0,
        alquileres: 0,
      };
      const horas =
        (new Date(a.fechaSalidaReal || a.fechaSalida).getTime() -
          new Date(a.creadoEn).getTime()) /
        (3600 * 1000);
      cur.noches += Math.max(0, horas / 24);
      cur.ingresos += Number(a.total);
      cur.alquileres += 1;
      byDia.set(key, cur);
    }
    const serie = Array.from(byDia.entries())
      .map(([fecha, v]) => ({
        fecha,
        ocupacionPct:
          activas > 0 ? Math.min(100, (v.noches / activas) * 100) : 0,
        ingresos: Number(v.ingresos.toFixed(2)),
        alquileres: v.alquileres,
      }))
      .sort((a, b) => (a.fecha < b.fecha ? -1 : 1));

    // Día con mejor/peor ocupación
    const mejorDia =
      serie.length > 0
        ? serie.reduce(
            (best, d) => (d.ocupacionPct > best.ocupacionPct ? d : best),
            serie[0],
          )
        : null;

    const tasaAnulacion =
      totalAlquileres + anulados > 0
        ? (anulados / (totalAlquileres + anulados)) * 100
        : 0;

    return {
      periodo: {
        desde: rango.gte.toISOString(),
        hasta: rango.lte.toISOString(),
        dias: diasPeriodo,
      },
      inventario: {
        totalHabitaciones: totalHab,
        habitacionesActivas: activas,
      },
      ocupacion: {
        promedioPct: Number(ocupacionPromedioPct.toFixed(1)),
        nochesOcupadas: Number(nochesOcupadas.toFixed(1)),
        nochesDisponibles,
      },
      ingresos: {
        total: Number(ingresoTotal.toFixed(2)),
        habitacion: Number(ingresoHab.toFixed(2)),
        productos: Number(ingresoProd.toFixed(2)),
      },
      kpis: {
        adr: Number(adr.toFixed(2)),
        revpar: Number(revpar.toFixed(2)),
        ticketPromedio: Number(ticketPromedio.toFixed(2)),
        estadiaPromedioHoras: Number(estadiaPromedioHoras.toFixed(1)),
      },
      alquileres: {
        finalizados: totalAlquileres,
        anulados,
        activos,
        tasaAnulacionPct: Number(tasaAnulacion.toFixed(1)),
      },
      clientes: {
        total: dnisEnPeriodo.length,
        nuevos: clientesNuevos,
        recurrentes: clientesRecurrentes,
      },
      topHabitaciones,
      topCajeros,
      serie,
      mejorDia,
    };
  }

  /**
   * Panel SUPERADMIN: comparativo global entre sedes + KPIs totales
   */
  async panelGlobal(dto: RangoDto) {
    const where = this.whereConRangoGlobal(dto);

    const [porSede, totales, nuevosClientes, porMetodo] = await Promise.all([
      this.prisma.alquiler.groupBy({
        by: ['sedeId'],
        where,
        _count: { _all: true },
        _sum: { total: true },
      }),
      this.prisma.alquiler.aggregate({
        where,
        _count: { _all: true },
        _sum: { total: true },
      }),
      this.contarClientesNuevos(dto),
      this.prisma.alquiler.groupBy({
        by: ['metodoPago'],
        where,
        _count: { metodoPago: true },
        _sum: { total: true },
      }),
    ]);

    const sedes = await this.prisma.sede.findMany({
      where: { id: { in: porSede.map((s) => s.sedeId) } },
      select: { id: true, nombre: true },
    });
    const sedeNombre = new Map(sedes.map((s) => [s.id, s.nombre]));

    const sedesRanking = porSede
      .map((s) => ({
        sedeId: s.sedeId,
        sedeNombre: sedeNombre.get(s.sedeId) ?? `Sede ${s.sedeId}`,
        alquileres: s._count._all,
        ingresos: Number(s._sum.total ?? 0),
      }))
      .sort((a, b) => b.ingresos - a.ingresos);

    return {
      totales: {
        alquileres: totales._count._all,
        ingresos: Number(totales._sum.total ?? 0),
        clientesNuevos: nuevosClientes,
      },
      sedesRanking,
      porMetodo: porMetodo.map((p) => ({
        metodo: p.metodoPago,
        cantidad: p._count.metodoPago,
        total: Number(p._sum.total ?? 0),
      })),
    };
  }

  private async contarClientesNuevos(dto: RangoDto): Promise<number> {
    // "Cliente nuevo" = DNI cuya primera aparición cae dentro del rango
    const rango = this.rangoFechas(dto);

    // Distinct DNIs dentro del rango
    const dentro = await this.prisma.alquiler.groupBy({
      by: ['clienteDni'],
      where: {
        creadoEn: rango
          ? { gte: rango.gte, lte: rango.lte }
          : undefined,
        clienteDni: { not: '' },
      },
    });
    if (dentro.length === 0) return 0;

    // Primera aparición de cada DNI (en toda la historia)
    const primeros = await this.prisma.alquiler.groupBy({
      by: ['clienteDni'],
      where: {
        clienteDni: { in: dentro.map((d) => d.clienteDni) },
      },
      _min: { creadoEn: true },
    });

    let count = 0;
    for (const p of primeros) {
      if (!p._min.creadoEn) continue;
      if (rango) {
        if (p._min.creadoEn >= rango.gte && p._min.creadoEn <= rango.lte) {
          count += 1;
        }
      } else {
        count += 1;
      }
    }
    return count;
  }

  private rangoFechas(dto: RangoDto) {
    if (!dto.desde && !dto.hasta) return null;
    const gte = dto.desde ? new Date(dto.desde) : new Date(0);
    const lte = dto.hasta ? new Date(dto.hasta) : new Date();
    if (dto.hasta) lte.setHours(23, 59, 59, 999);
    return { gte, lte };
  }

  private whereConRango(sedeId: number, dto: RangoDto, incluirAnulados: boolean) {
    const where: any = { sedeId };
    if (!incluirAnulados) where.estado = EstadoAlquiler.FINALIZADO;
    const rango = this.rangoFechas(dto);
    if (rango) where.creadoEn = rango;
    return where;
  }

  private whereConRangoGlobal(dto: RangoDto) {
    const where: any = { estado: EstadoAlquiler.FINALIZADO };
    const rango = this.rangoFechas(dto);
    if (rango) where.creadoEn = rango;
    return where;
  }
}
