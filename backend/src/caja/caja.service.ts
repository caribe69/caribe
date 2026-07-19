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

    // Lista detallada de alquileres cobrados (para tabla de detalle)
    const alquileresLista = alquileresValidos.map((a: any) => {
      const pagosDeEsteAlq = pagosTurno.filter((p) => p.alquiler.id === a.id);
      const totalPagado = pagosDeEsteAlq.reduce(
        (s, p) => s + Number(p.monto),
        0,
      );
      return {
        id: a.id,
        numeroHabitacion: a.habitacion.numero,
        tipoHabitacion: a.habitacion.descripcion ?? null,
        cliente: a.clienteNombre,
        clienteDni: a.clienteDni,
        total: Number(a.total),
        precioHabitacion: Number(a.precioHabitacion),
        totalProductos: Number(a.totalProductos),
        pagado: Number(a.montoPagado ?? 0),
        pagadoEnEsteTurno: totalPagado,
        estado: a.estado,
        metodosPago: pagosDeEsteAlq.map((p) => ({
          metodo: p.metodoPago,
          monto: Number(p.monto),
          fecha: p.fecha,
        })),
      };
    });

    // Lista detallada de ventas directas
    const ventasDirectasLista = ventasValidas.map((v: any) => ({
      id: v.id,
      total: Number(v.total),
      metodoPago: v.metodoPago,
      creadoEn: v.creadoEn,
      notas: v.notas,
      items: v.items.map((it: any) => ({
        producto: it.producto.nombre,
        cantidad: it.cantidad,
        subtotal: Number(it.subtotal),
      })),
    }));

    // Lista de pagos individuales (para auditoría de qué se cobró cuando)
    const pagosLista = pagosTurno.map((p) => ({
      id: p.id,
      alquilerId: p.alquiler.id,
      numeroHabitacion: p.alquiler.habitacion.numero,
      cliente: p.alquiler.clienteNombre,
      monto: Number(p.monto),
      metodoPago: p.metodoPago,
      fecha: p.fecha,
    }));

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
        lista: alquileresLista,
      },
      ventasDirectas: {
        cantidad: ventasValidas.length,
        total: ventasValidas.reduce((s, v) => s + Number(v.total), 0),
        lista: ventasDirectasLista,
      },
      pagos: pagosLista,
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

  /**
   * REPORTE "BOLETA 2" — reproduce la hojita de cierre por turno:
   * H (habitaciones) · B (bebidas) · O (otros) · G (total) · digital · efectivo,
   * ingresos por modo de llegada (a pie / vehículo), limpieza por persona, y el
   * detalle de productos separado en bebidas y otros. Solo lectura (no emite nada).
   */
  async reporteBoleta2(id: number, user: JwtPayload) {
    const turno = await this.prisma.turnoCaja.findUnique({
      where: { id },
      include: {
        usuario: { select: { id: true, nombre: true, username: true } },
        sede: { select: { id: true, nombre: true } },
        ventas: {
          include: {
            items: { include: { producto: { include: { categoria: true } } } },
          },
        },
      },
    });
    if (!turno) throw new NotFoundException('Turno no encontrado');
    enforceSede(user, turno.sedeId);

    const pagosTurno = await this.prisma.pagoAlquiler.findMany({
      where: { turnoCajaId: id },
      include: {
        alquiler: {
          include: {
            consumos: {
              include: { producto: { include: { categoria: true } } },
            },
          },
        },
      },
    });

    const esBebida = (nombreCat?: string | null) =>
      !!nombreCat && /bebid/i.test(nombreCat);

    type Tally = { nombre: string; cantidad: number; total: number };
    const bebidasMap = new Map<number, Tally>();
    const otrosMap = new Map<number, Tally>();
    const acumular = (prod: any, cantidad: number, subtotal: number) => {
      const bucket = esBebida(prod.categoria?.nombre) ? bebidasMap : otrosMap;
      const cur = bucket.get(prod.id) ?? {
        nombre: prod.nombre,
        cantidad: 0,
        total: 0,
      };
      cur.cantidad += cantidad;
      cur.total += subtotal;
      bucket.set(prod.id, cur);
    };

    // Consumos dentro de alquileres cobrados (alquiler único por pago)
    const alquileresMap = new Map<number, any>();
    for (const p of pagosTurno) alquileresMap.set(p.alquiler.id, p.alquiler);
    for (const a of alquileresMap.values())
      for (const c of a.consumos)
        acumular(c.producto, c.cantidad, Number(c.subtotal));

    // Ventas directas del turno (no anuladas)
    const ventasValidas = turno.ventas.filter(
      (v) => v.estado !== EstadoVenta.ANULADA,
    );
    for (const v of ventasValidas)
      for (const it of v.items)
        acumular(it.producto, it.cantidad, Number(it.subtotal));

    const bebidas = Array.from(bebidasMap.values()).sort((a, b) =>
      a.nombre.localeCompare(b.nombre),
    );
    const otros = Array.from(otrosMap.values()).sort((a, b) =>
      a.nombre.localeCompare(b.nombre),
    );
    const B = bebidas.reduce((s, x) => s + x.total, 0);
    const O = otros.reduce((s, x) => s + x.total, 0);

    // ── PLANTILLA FIJA (igual a la hojita de papel) ──
    // Columna izquierda = bebidas; derecha = otros. Cada renglón es un código
    // fijo. Se llena buscando productos cuyo nombre EMPIECE por ese código.
    const CODIGOS_BEBIDAS = ['CB', 'CN', 'CT', 'IM', 'CM', 'SM', 'GAT', 'FRU', 'VIN', 'PISC', 'WIS', 'GUA', 'EVE'];
    const CODIGOS_OTROS = ['TH', 'SH', 'PIEL', 'CEPI', 'KOLY', 'JABO', 'SHIK', 'PEIN', 'GALL', 'HALL', 'CHIC', 'PIQU'];
    const norm = (s: string) =>
      s.toUpperCase().normalize('NFD').replace(/[^A-Z0-9]/g, '');
    const armarPlantilla = (items: Tally[], codigos: string[]) => {
      // Códigos más largos primero para que "PISC" gane a "PI", etc.
      const orden = [...codigos].sort((a, b) => b.length - a.length);
      const acum: Record<string, { cantidad: number; total: number }> = {};
      const extras: Tally[] = [];
      for (const it of items) {
        const n = norm(it.nombre);
        const code = orden.find((c) => n.startsWith(c));
        if (code) {
          acum[code] = acum[code] || { cantidad: 0, total: 0 };
          acum[code].cantidad += it.cantidad;
          acum[code].total += it.total;
        } else {
          extras.push(it);
        }
      }
      const filas = codigos.map((c) => ({
        codigo: c,
        cantidad: acum[c]?.cantidad ?? 0,
        total: acum[c]?.total ?? 0,
      }));
      return { filas, extras };
    };
    const plantilla = {
      bebidas: armarPlantilla(bebidas, CODIGOS_BEBIDAS),
      otros: armarPlantilla(otros, CODIGOS_OTROS),
    };

    // H (habitaciones) proporcional a cada pago + métodos de pago
    let H = 0;
    const porMetodo: Record<string, number> = {
      EFECTIVO: 0, VISA: 0, MASTERCARD: 0, YAPE: 0, PLIN: 0, OTRO: 0,
    };
    for (const p of pagosTurno) {
      const a = p.alquiler;
      const aTotal = Number(a.total);
      const aHab = Number(a.precioHabitacion);
      const monto = Number(p.monto);
      if (aTotal > 0) H += monto * (aHab / aTotal);
      porMetodo[p.metodoPago] += monto;
    }
    for (const v of ventasValidas) porMetodo[v.metodoPago] += Number(v.total);

    const G = H + B + O;
    const digital =
      porMetodo.VISA + porMetodo.MASTERCARD + porMetodo.YAPE + porMetodo.PLIN + porMetodo.OTRO;
    const efectivo = G - digital;

    // Ingresos por modo de llegada (alquileres creados en este turno)
    const alqTurno = await this.prisma.alquiler.groupBy({
      by: ['modoLlegada'],
      where: { turnoCajaId: id, estado: { not: EstadoAlquiler.ANULADO } },
      _count: { _all: true },
    });
    let aPie = 0;
    let enVehiculo = 0;
    for (const g of alqTurno) {
      if (g.modoLlegada === 'VEHICULO') enVehiculo += g._count._all;
      else aPie += g._count._all; // PIE o sin registrar
    }

    // Limpieza durante el turno (tareas completadas en su ventana)
    const hasta = turno.cerradoEn ?? new Date();
    const tareas = await this.prisma.tareaLimpieza.findMany({
      where: {
        sedeId: turno.sedeId,
        estado: 'COMPLETADA',
        completadaEn: { gte: turno.abiertoEn, lte: hasta },
      },
      include: { asignadaA: { select: { id: true, nombre: true } } },
    });
    const limpMap = new Map<number, { nombre: string; habitaciones: number }>();
    for (const t of tareas) {
      const key = t.asignadaAId ?? 0;
      const cur = limpMap.get(key) ?? {
        nombre: t.asignadaA?.nombre ?? 'Sin asignar',
        habitaciones: 0,
      };
      cur.habitaciones += 1;
      limpMap.set(key, cur);
    }

    return {
      turno: {
        id: turno.id,
        abiertoEn: turno.abiertoEn,
        cerradoEn: turno.cerradoEn,
        estado: turno.estado,
        usuario: turno.usuario,
        sede: turno.sede,
      },
      desglose: { H, B, O, G, digital, efectivo },
      porMetodo,
      ingresos: { aPie, enVehiculo, total: aPie + enVehiculo },
      limpieza: Array.from(limpMap.values()),
      productos: { bebidas, otros },
      plantilla,
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
