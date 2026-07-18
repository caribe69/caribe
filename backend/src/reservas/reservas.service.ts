import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EstadoAlquiler, EstadoReserva, TipoReserva } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from '../auth/auth.service';
import { enforceSede, resolveSedeId } from '../common/sede-scope';

export interface CrearReservaInput {
  sedeId?: number;
  habitacionId: number;
  clienteNombre: string;
  clienteDni?: string;
  clienteTelefono?: string;
  inicio: string;
  fin: string;
  tipo?: TipoReserva;
  adelanto?: number;
  notas?: string;
}

@Injectable()
export class ReservasService {
  constructor(private prisma: PrismaService) {}

  /**
   * Verifica si una franja [inicio, fin] choca con otra reserva PENDIENTE o
   * con un alquiler ACTIVO de la misma habitación. Solapan si:
   *   inicioA < finB && finA > inicioB
   */
  async hayConflicto(
    habitacionId: number,
    inicio: Date,
    fin: Date,
    exceptoReservaId?: number,
  ): Promise<{ tipo: 'reserva' | 'alquiler'; desde: Date; hasta: Date } | null> {
    const reserva = await this.prisma.reserva.findFirst({
      where: {
        habitacionId,
        estado: EstadoReserva.PENDIENTE,
        id: exceptoReservaId ? { not: exceptoReservaId } : undefined,
        inicio: { lt: fin },
        fin: { gt: inicio },
      },
      orderBy: { inicio: 'asc' },
    });
    if (reserva)
      return { tipo: 'reserva', desde: reserva.inicio, hasta: reserva.fin };

    const alquiler = await this.prisma.alquiler.findFirst({
      where: {
        habitacionId,
        estado: EstadoAlquiler.ACTIVO,
        fechaIngreso: { lt: fin },
        fechaSalida: { gt: inicio },
      },
    });
    if (alquiler)
      return {
        tipo: 'alquiler',
        desde: alquiler.fechaIngreso,
        hasta: alquiler.fechaSalida,
      };

    return null;
  }

  async crear(user: JwtPayload, dto: CrearReservaInput) {
    const sedeId = resolveSedeId(user, dto.sedeId);
    if (!dto.clienteNombre?.trim())
      throw new BadRequestException('El nombre del cliente es obligatorio');

    const inicio = new Date(dto.inicio);
    const fin = new Date(dto.fin);
    if (isNaN(inicio.getTime()) || isNaN(fin.getTime()))
      throw new BadRequestException('Fechas inválidas');
    if (fin <= inicio)
      throw new BadRequestException('La hora de fin debe ser posterior al inicio');

    const hab = await this.prisma.habitacion.findUnique({
      where: { id: dto.habitacionId },
    });
    if (!hab || hab.sedeId !== sedeId)
      throw new BadRequestException('Habitación inválida');

    const conflicto = await this.hayConflicto(dto.habitacionId, inicio, fin);
    if (conflicto)
      throw new ConflictException(
        `La habitación ya está ${conflicto.tipo === 'reserva' ? 'reservada' : 'ocupada'} de ${this.fmt(conflicto.desde)} a ${this.fmt(conflicto.hasta)}.`,
      );

    return this.prisma.reserva.create({
      data: {
        sedeId,
        habitacionId: dto.habitacionId,
        clienteNombre: dto.clienteNombre.trim(),
        clienteDni: dto.clienteDni?.trim() || null,
        clienteTelefono: dto.clienteTelefono?.trim() || null,
        inicio,
        fin,
        tipo: dto.tipo ?? TipoReserva.POR_HORA,
        adelanto: dto.adelanto ?? 0,
        notas: dto.notas?.trim() || null,
        creadoPorId: user.sub,
      },
      include: this.includeBasico(),
    });
  }

  async listar(
    user: JwtPayload,
    opts: { sedeId?: number; estado?: EstadoReserva; desde?: string; hasta?: string },
  ) {
    const sedeId = resolveSedeId(user, opts.sedeId);
    const where: any = { sedeId };
    if (opts.estado) where.estado = opts.estado;
    if (opts.desde || opts.hasta) {
      where.inicio = {};
      if (opts.desde) where.inicio.gte = new Date(opts.desde);
      if (opts.hasta) {
        const h = new Date(opts.hasta);
        h.setHours(23, 59, 59, 999);
        where.inicio.lte = h;
      }
    }
    return this.prisma.reserva.findMany({
      where,
      orderBy: [{ estado: 'asc' }, { inicio: 'asc' }],
      include: this.includeBasico(),
    });
  }

  /**
   * Estado de reservas para pintar la grilla de habitaciones: devuelve las
   * reservas PENDIENTES que aún no terminan (cubren ahora o son próximas).
   */
  async estadoHabitaciones(user: JwtPayload, sedeIdQuery?: number) {
    const sedeId = resolveSedeId(user, sedeIdQuery);
    const ahora = new Date();
    const reservas = await this.prisma.reserva.findMany({
      where: {
        sedeId,
        estado: EstadoReserva.PENDIENTE,
        fin: { gte: ahora },
      },
      orderBy: { inicio: 'asc' },
      select: {
        id: true,
        habitacionId: true,
        clienteNombre: true,
        inicio: true,
        fin: true,
        tipo: true,
      },
    });
    return reservas.map((r) => ({
      ...r,
      cubreAhora: r.inicio <= ahora && r.fin >= ahora,
    }));
  }

  /**
   * Disponibilidad de todas las habitaciones de la sede en una franja
   * [inicio, fin]: para cada una dice si está LIBRE, RESERVADA u OCUPADA
   * justamente en ese horario. Es lo que permite reservar "para las 8pm".
   */
  async disponibilidad(
    user: JwtPayload,
    inicioStr: string,
    finStr: string,
    sedeIdQuery?: number,
  ) {
    const sedeId = resolveSedeId(user, sedeIdQuery);
    const inicio = new Date(inicioStr);
    const fin = new Date(finStr);
    if (isNaN(inicio.getTime()) || isNaN(fin.getTime()) || fin <= inicio)
      throw new BadRequestException('Franja horaria inválida');

    const [habitaciones, reservas, alquileres] = await Promise.all([
      this.prisma.habitacion.findMany({
        where: { sedeId, activa: true },
        orderBy: [{ pisoId: 'asc' }, { numero: 'asc' }],
        select: {
          id: true,
          numero: true,
          descripcion: true,
          precioHora: true,
          precioNoche: true,
          estado: true,
          piso: { select: { numero: true } },
        },
      }),
      this.prisma.reserva.findMany({
        where: {
          sedeId,
          estado: EstadoReserva.PENDIENTE,
          inicio: { lt: fin },
          fin: { gt: inicio },
        },
        select: { habitacionId: true, clienteNombre: true, inicio: true, fin: true },
      }),
      this.prisma.alquiler.findMany({
        where: {
          sedeId,
          estado: EstadoAlquiler.ACTIVO,
          fechaIngreso: { lt: fin },
          fechaSalida: { gt: inicio },
        },
        select: { habitacionId: true, clienteNombre: true, fechaIngreso: true, fechaSalida: true },
      }),
    ]);

    const reservaPorHab = new Map(reservas.map((r) => [r.habitacionId, r]));
    const alquilerPorHab = new Map(alquileres.map((a) => [a.habitacionId, a]));

    return habitaciones.map((h) => {
      const alq = alquilerPorHab.get(h.id);
      const res = reservaPorHab.get(h.id);
      let estado: 'LIBRE' | 'OCUPADA' | 'RESERVADA' | 'BLOQUEADA' = 'LIBRE';
      let detalle: string | null = null;
      if (alq) {
        estado = 'OCUPADA';
        detalle = `${alq.clienteNombre}`;
      } else if (res) {
        estado = 'RESERVADA';
        detalle = `${res.clienteNombre} · ${this.fmt(res.inicio)}–${this.fmt(res.fin)}`;
      } else if (
        h.estado === 'MANTENIMIENTO' ||
        h.estado === 'FUERA_SERVICIO'
      ) {
        estado = 'BLOQUEADA';
        detalle = h.estado;
      }
      return {
        id: h.id,
        numero: h.numero,
        descripcion: h.descripcion,
        piso: h.piso.numero,
        precioHora: Number(h.precioHora),
        precioNoche: Number(h.precioNoche),
        estadoFranja: estado,
        detalle,
      };
    });
  }

  async cancelar(user: JwtPayload, id: number) {
    const r = await this.prisma.reserva.findUnique({ where: { id } });
    if (!r) throw new NotFoundException('Reserva no encontrada');
    enforceSede(user, r.sedeId);
    if (r.estado !== EstadoReserva.PENDIENTE)
      throw new BadRequestException(
        `No se puede cancelar una reserva ${r.estado.toLowerCase()}`,
      );
    return this.prisma.reserva.update({
      where: { id },
      data: {
        estado: EstadoReserva.CANCELADA,
        canceladoPorId: user.sub,
        canceladoEn: new Date(),
      },
    });
  }

  private includeBasico() {
    return {
      habitacion: {
        select: {
          id: true,
          numero: true,
          sedeId: true,
          descripcion: true,
          precioHora: true,
          precioNoche: true,
        },
      },
      creadoPor: { select: { id: true, nombre: true } },
    };
  }

  private fmt(d: Date) {
    return d.toLocaleString('es-PE', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}
