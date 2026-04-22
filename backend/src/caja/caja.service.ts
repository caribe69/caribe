import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  EstadoAlquiler,
  EstadoTurno,
  EstadoVenta,
  MetodoPago,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from '../auth/auth.service';
import { enforceSede, resolveSedeId } from '../common/sede-scope';

@Injectable()
export class CajaService {
  constructor(private prisma: PrismaService) {}

  async turnoAbierto(user: JwtPayload) {
    return this.prisma.turnoCaja.findFirst({
      where: {
        usuarioId: user.sub,
        estado: EstadoTurno.ABIERTO,
      },
      include: { sede: { select: { id: true, nombre: true } } },
    });
  }

  async abrir(user: JwtPayload, sedeIdBody?: number) {
    const sedeId = resolveSedeId(user, sedeIdBody);
    const abierto = await this.prisma.turnoCaja.findFirst({
      where: { usuarioId: user.sub, estado: EstadoTurno.ABIERTO },
    });
    if (abierto)
      throw new BadRequestException('Ya tienes un turno abierto');

    return this.prisma.turnoCaja.create({
      data: { sedeId, usuarioId: user.sub },
    });
  }

  async cerrar(id: number, user: JwtPayload, notas?: string) {
    const turno = await this.prisma.turnoCaja.findUnique({
      where: { id },
      include: {
        ventas: {
          where: { estado: { not: EstadoVenta.ANULADA } },
        },
      },
    });
    if (!turno) throw new NotFoundException('Turno no encontrado');
    enforceSede(user, turno.sedeId);
    if (turno.usuarioId !== user.sub)
      throw new BadRequestException('No puedes cerrar turno de otro usuario');
    if (turno.estado === EstadoTurno.CERRADO)
      throw new BadRequestException('Turno ya cerrado');

    // Pagos individuales registrados EN este turno (soporta parciales)
    const pagos = await this.prisma.pagoAlquiler.findMany({
      where: { turnoCajaId: id },
    });

    const totales = {
      EFECTIVO: 0,
      VISA: 0,
      MASTERCARD: 0,
      YAPE: 0,
      PLIN: 0,
      OTRO: 0,
    };
    let total = 0;
    for (const p of pagos) {
      const t = Number(p.monto);
      totales[p.metodoPago] += t;
      total += t;
    }
    for (const v of turno.ventas) {
      const t = Number(v.total);
      totales[v.metodoPago] += t;
      total += t;
    }

    return this.prisma.turnoCaja.update({
      where: { id: turno.id },
      data: {
        estado: EstadoTurno.CERRADO,
        cerradoEn: new Date(),
        totalEfectivo: totales.EFECTIVO,
        totalVisa: totales.VISA,
        totalMaster: totales.MASTERCARD,
        totalYape: totales.YAPE,
        totalPlin: totales.PLIN,
        totalOtro: totales.OTRO,
        totalGeneral: total,
        notas,
      },
    });
  }

  async reporte(id: number, user: JwtPayload) {
    const turno = await this.prisma.turnoCaja.findUnique({
      where: { id },
      include: {
        usuario: { select: { id: true, nombre: true, username: true } },
        sede: { select: { id: true, nombre: true } },
        ventas: {
          include: {
            items: { include: { producto: true } },
          },
          orderBy: { creadoEn: 'asc' },
        },
      },
    });
    if (!turno) throw new NotFoundException('Turno no encontrado');
    enforceSede(user, turno.sedeId);

    // Pagos registrados en este turno (soporta pagos parciales)
    const pagosTurno = await this.prisma.pagoAlquiler.findMany({
      where: { turnoCajaId: id },
      include: {
        alquiler: {
          include: {
            habitacion: true,
            consumos: { include: { producto: true } },
            creadoPor: { select: { id: true, nombre: true, username: true } },
          },
        },
      },
      orderBy: { fecha: 'asc' },
    });
    // Alquileres únicos detrás de esos pagos (para desglose H/B)
    const alquileresMap = new Map<number, any>();
    for (const p of pagosTurno) {
      alquileresMap.set(p.alquiler.id, p.alquiler);
    }
    const alquileresCobrados = Array.from(alquileresMap.values());

    // Alquileres ABIERTOS en este turno pero aún sin cobrar (informativo)
    const alquileresPendientes = await this.prisma.alquiler.findMany({
      where: {
        turnoCajaId: id,
        pagado: false,
        estado: { not: EstadoAlquiler.ANULADO },
      },
      include: {
        habitacion: true,
      },
    });

    const productosVendidos: Record<
      number,
      { nombre: string; cantidad: number; total: number }
    > = {};

    for (const a of alquileresCobrados) {
      for (const c of a.consumos) {
        const k = c.productoId;
        if (!productosVendidos[k]) {
          productosVendidos[k] = {
            nombre: c.producto.nombre,
            cantidad: 0,
            total: 0,
          };
        }
        productosVendidos[k].cantidad += c.cantidad;
        productosVendidos[k].total += Number(c.subtotal);
      }
    }

    for (const v of turno.ventas) {
      if (v.estado === EstadoVenta.ANULADA) continue;
      for (const it of v.items) {
        const k = it.productoId;
        if (!productosVendidos[k]) {
          productosVendidos[k] = {
            nombre: it.producto.nombre,
            cantidad: 0,
            total: 0,
          };
        }
        productosVendidos[k].cantidad += it.cantidad;
        productosVendidos[k].total += Number(it.subtotal);
      }
    }

    // Desglose: solo cobrados (ingreso real del turno)
    const alquileresValidos = alquileresCobrados;
    const ventasValidas = turno.ventas.filter(
      (v) => v.estado !== EstadoVenta.ANULADA,
    );

    let H = 0; // Habitaciones (solo precio de la habitación, proporcional al cobro)
    let B = 0; // Bebidas / productos (consumos + ventas directas)
    // Para pagos parciales: distribuimos cada pago proporcionalmente
    // entre habitación y productos según la composición del alquiler.
    for (const p of pagosTurno) {
      const a = p.alquiler;
      const aTotal = Number(a.total);
      const aHab = Number(a.precioHabitacion);
      const aProd = Number(a.totalProductos);
      const pagoMonto = Number(p.monto);
      if (aTotal > 0) {
        H += pagoMonto * (aHab / aTotal);
        B += pagoMonto * (aProd / aTotal);
      }
    }
    for (const v of ventasValidas) {
      B += Number(v.total);
    }
    const O = 0; // Otros — reservado para ajustes futuros
    const G = H + B + O;

    // Totales por método de pago (desde pagos + ventas)
    const porMetodo: Record<string, number> = {
      EFECTIVO: 0, VISA: 0, MASTERCARD: 0, YAPE: 0, PLIN: 0, OTRO: 0,
    };
    for (const p of pagosTurno) porMetodo[p.metodoPago] += Number(p.monto);
    for (const v of ventasValidas) porMetodo[v.metodoPago] += Number(v.total);

    const totalDigital =
      porMetodo.VISA + porMetodo.MASTERCARD + porMetodo.YAPE + porMetodo.PLIN + porMetodo.OTRO;
    const totalEfectivo = porMetodo.EFECTIVO;

    // Tier de habitaciones: agrupar alquileres por precioHabitacion
    const tiers: Record<string, number> = {};
    for (const a of alquileresValidos) {
      const price = Number(a.precioHabitacion).toFixed(2);
      tiers[price] = (tiers[price] || 0) + 1;
    }

    return {
      turno,
      productosVendidos: Object.values(productosVendidos),
      desglose: {
        H,            // habitaciones
        B,            // bebidas/productos
        O,            // otros
        G,            // gran total
        totalEfectivo,
        totalDigital,
      },
      porMetodo,
      alquileres: {
        cantidad: alquileresValidos.length,
        porTier: tiers,
      },
      ventasDirectas: {
        cantidad: ventasValidas.length,
        total: ventasValidas.reduce((s, v) => s + Number(v.total), 0),
      },
      pendientesDeCobro: {
        cantidad: alquileresPendientes.length,
        monto: alquileresPendientes.reduce(
          (s, a) => s + Number(a.total),
          0,
        ),
        lista: alquileresPendientes.map((a) => ({
          id: a.id,
          habitacion: a.habitacion.numero,
          cliente: a.clienteNombre,
          total: Number(a.total),
        })),
      },
    };
  }

  async listarTurnos(user: JwtPayload, sedeIdQuery?: number) {
    const sedeId = resolveSedeId(user, sedeIdQuery);
    const where: any = { sedeId };
    // ADMIN_SEDE / SUPERADMIN ven todos los turnos de la sede;
    // otros roles (HOTELERO / CAJERO / LIMPIEZA) ven solo los suyos.
    if (user.rol !== 'SUPERADMIN' && user.rol !== 'ADMIN_SEDE') {
      where.usuarioId = user.sub;
    }
    return this.prisma.turnoCaja.findMany({
      where,
      include: {
        usuario: { select: { id: true, nombre: true, username: true } },
      },
      orderBy: { abiertoEn: 'desc' },
      take: 200,
    });
  }

  /** Estadísticas agregadas (alcance según rol) */
  async estadisticas(user: JwtPayload, sedeIdQuery?: number) {
    const sedeId = resolveSedeId(user, sedeIdQuery);
    const where: any = { sedeId, estado: 'CERRADO' };
    if (user.rol !== 'SUPERADMIN' && user.rol !== 'ADMIN_SEDE') {
      where.usuarioId = user.sub;
    }

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const semana = new Date(hoy);
    semana.setDate(semana.getDate() - 7);
    const mes = new Date(hoy);
    mes.setDate(mes.getDate() - 30);

    const turnos = await this.prisma.turnoCaja.findMany({
      where,
      select: {
        id: true,
        cerradoEn: true,
        totalEfectivo: true,
        totalVisa: true,
        totalMaster: true,
        totalYape: true,
        totalPlin: true,
        totalOtro: true,
        totalGeneral: true,
      },
      orderBy: { cerradoEn: 'desc' },
      take: 200,
    });

    const agregar = (desde: Date) => {
      const relevantes = turnos.filter(
        (t) => t.cerradoEn && new Date(t.cerradoEn) >= desde,
      );
      const total = relevantes.reduce(
        (s, t) => s + Number(t.totalGeneral),
        0,
      );
      const efectivo = relevantes.reduce(
        (s, t) => s + Number(t.totalEfectivo),
        0,
      );
      const visa = relevantes.reduce((s, t) => s + Number(t.totalVisa), 0);
      const master = relevantes.reduce(
        (s, t) => s + Number(t.totalMaster),
        0,
      );
      const yape = relevantes.reduce((s, t) => s + Number(t.totalYape), 0);
      const plin = relevantes.reduce((s, t) => s + Number(t.totalPlin), 0);
      const otro = relevantes.reduce((s, t) => s + Number(t.totalOtro), 0);
      return {
        cantidadTurnos: relevantes.length,
        total,
        promedio: relevantes.length ? total / relevantes.length : 0,
        porMetodo: { efectivo, visa, master, yape, plin, otro },
      };
    };

    return {
      scope:
        user.rol === 'SUPERADMIN' || user.rol === 'ADMIN_SEDE'
          ? 'sede'
          : 'personal',
      hoy: agregar(hoy),
      semana: agregar(semana),
      mes: agregar(mes),
    };
  }
}
