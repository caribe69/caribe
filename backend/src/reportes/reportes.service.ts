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
