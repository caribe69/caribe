import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  EstadoAlquiler,
  EstadoHabitacion,
  EstadoTareaLimpieza,
  EstadoTurno,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from '../auth/auth.service';
import { enforceSede, resolveSedeId } from '../common/sede-scope';
import {
  AsignarHuespedDto,
  CreateReservaGrupalDto,
} from './reserva-grupal.dto';

@Injectable()
export class ReservasGrupalesService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateReservaGrupalDto, user: JwtPayload) {
    const sedeId = resolveSedeId(user, dto.sedeId);

    if (!/^(10|15|17|20)\d{9}$/.test(dto.clienteRuc))
      throw new BadRequestException('RUC inválido');

    // Verificar habitaciones: todas de la misma sede + DISPONIBLES + sin duplicados
    const ids = Array.from(new Set(dto.habitacionIds));
    if (ids.length !== dto.habitacionIds.length)
      throw new BadRequestException('Habitaciones duplicadas en la selección');

    const habitaciones = await this.prisma.habitacion.findMany({
      where: { id: { in: ids } },
    });
    if (habitaciones.length !== ids.length)
      throw new BadRequestException('Alguna habitación no existe');

    for (const h of habitaciones) {
      if (h.sedeId !== sedeId)
        throw new BadRequestException(
          `Habitación ${h.numero} no pertenece a la sede activa`,
        );
      if (h.estado !== EstadoHabitacion.DISPONIBLE)
        throw new ConflictException(
          `Habitación ${h.numero} no disponible (${h.estado})`,
        );
    }

    // Turno de caja abierto
    const turno = await this.prisma.turnoCaja.findFirst({
      where: {
        sedeId,
        usuarioId: user.sub,
        estado: EstadoTurno.ABIERTO,
      },
    });
    if (!turno)
      throw new BadRequestException(
        'No tienes turno de caja abierto. Abre caja primero.',
      );

    // Mapa de huéspedes opcionales por habitacionId
    const huespedPorHab = new Map<number, CreateReservaGrupalDto['huespedes'] extends (infer U)[] | undefined ? U : never>();
    for (const h of dto.huespedes || []) {
      huespedPorHab.set(h.habitacionId, h);
    }

    const precio = Number(dto.precioPorHabitacion);
    const totalReserva = precio * ids.length;

    return this.prisma.$transaction(async (tx) => {
      const reserva = await tx.reservaGrupal.create({
        data: {
          sedeId,
          turnoCajaId: turno.id,
          clienteRuc: dto.clienteRuc,
          clienteRazonSocial: dto.clienteRazonSocial.toUpperCase(),
          clienteDireccionFiscal: dto.clienteDireccionFiscal || null,
          contactoNombre: dto.contactoNombre || null,
          contactoTelefono: dto.contactoTelefono || null,
          fechaIngreso: new Date(dto.fechaIngreso),
          fechaSalida: new Date(dto.fechaSalida),
          total: totalReserva,
          metodoPago: dto.metodoPago,
          notas: dto.notas || null,
          creadoPorId: user.sub,
        },
      });

      const alquileresCreados: any[] = [];
      for (const hab of habitaciones) {
        const h = huespedPorHab.get(hab.id);
        const nombre = (h?.nombre || '').trim();
        const dni = (h?.dni || '').trim();
        const telefono = (h?.telefono || '').trim();

        const alquiler = await tx.alquiler.create({
          data: {
            sedeId,
            habitacionId: hab.id,
            turnoCajaId: turno.id,
            reservaGrupalId: reserva.id,
            clienteNombre:
              nombre || `${dto.clienteRazonSocial.toUpperCase()} (por asignar)`,
            clienteDni: dni || '00000000',
            clienteTelefono: telefono || null,
            fechaIngreso: new Date(dto.fechaIngreso),
            fechaSalida: new Date(dto.fechaSalida),
            precioHabitacion: precio,
            total: precio,
            metodoPago: dto.metodoPago,
            notas: dto.notas || null,
            tipoComprobante: 'FACTURA',
            clienteRuc: dto.clienteRuc,
            clienteRazonSocial: dto.clienteRazonSocial.toUpperCase(),
            clienteDireccionFiscal: dto.clienteDireccionFiscal || null,
            creadoPorId: user.sub,
          },
        });
        alquileresCreados.push(alquiler);

        await tx.habitacion.update({
          where: { id: hab.id },
          data: { estado: EstadoHabitacion.OCUPADA },
        });
      }

      return tx.reservaGrupal.findUnique({
        where: { id: reserva.id },
        include: {
          alquileres: { include: { habitacion: { include: { piso: true } } } },
          creadoPor: { select: { id: true, nombre: true, username: true } },
          sede: true,
        },
      });
    });
  }

  async findAll(user: JwtPayload) {
    const sedeId = resolveSedeId(user);
    const where: any = {};
    if (user.rol !== 'SUPERADMIN') where.sedeId = sedeId;
    return this.prisma.reservaGrupal.findMany({
      where,
      include: {
        alquileres: { include: { habitacion: true } },
        creadoPor: { select: { id: true, nombre: true, username: true } },
        sede: { select: { id: true, nombre: true } },
      },
      orderBy: { creadoEn: 'desc' },
      take: 200,
    });
  }

  async findOne(id: number, user: JwtPayload) {
    const r = await this.prisma.reservaGrupal.findUnique({
      where: { id },
      include: {
        alquileres: {
          include: {
            habitacion: { include: { piso: true } },
            consumos: { include: { producto: true } },
          },
        },
        creadoPor: { select: { id: true, nombre: true, username: true } },
        sede: true,
      },
    });
    if (!r) throw new NotFoundException('Reserva grupal no encontrada');
    enforceSede(user, r.sedeId);
    return r;
  }

  /** Permite asignar o cambiar el huésped asignado a una habitación de la reserva */
  async asignarHuesped(
    reservaId: number,
    dto: AsignarHuespedDto,
    user: JwtPayload,
  ) {
    const reserva = await this.findOne(reservaId, user);
    const alquiler = reserva.alquileres.find((a) => a.id === dto.alquilerId);
    if (!alquiler)
      throw new NotFoundException('Alquiler no pertenece a esta reserva');
    if (alquiler.estado !== EstadoAlquiler.ACTIVO)
      throw new BadRequestException(
        'Solo puedes actualizar huésped en alquileres activos',
      );

    return this.prisma.alquiler.update({
      where: { id: alquiler.id },
      data: {
        clienteNombre:
          dto.nombre?.trim() ||
          `${reserva.clienteRazonSocial} (por asignar)`,
        clienteDni: dto.dni?.trim() || alquiler.clienteDni,
        clienteTelefono: dto.telefono?.trim() || null,
        clienteFechaNacimiento: dto.fechaNacimiento
          ? new Date(dto.fechaNacimiento)
          : alquiler.clienteFechaNacimiento,
      },
      include: {
        habitacion: { include: { piso: true } },
      },
    });
  }

  /** Finaliza TODOS los alquileres de la reserva grupal a la vez */
  async finalizar(id: number, user: JwtPayload) {
    const reserva = await this.findOne(id, user);
    if (reserva.estado !== EstadoAlquiler.ACTIVO)
      throw new BadRequestException('Reserva no activa');

    return this.prisma.$transaction(async (tx) => {
      for (const a of reserva.alquileres) {
        if (a.estado !== EstadoAlquiler.ACTIVO) continue;
        await tx.alquiler.update({
          where: { id: a.id },
          data: {
            estado: EstadoAlquiler.FINALIZADO,
            fechaSalidaReal: new Date(),
          },
        });
        await tx.habitacion.update({
          where: { id: a.habitacionId },
          data: { estado: EstadoHabitacion.ALISTANDO },
        });
        await tx.tareaLimpieza.create({
          data: {
            sedeId: a.sedeId,
            habitacionId: a.habitacionId,
            estado: EstadoTareaLimpieza.PENDIENTE,
            notas: `Post-reserva grupal #${reserva.id}`,
          },
        });
      }
      return tx.reservaGrupal.update({
        where: { id: reserva.id },
        data: { estado: EstadoAlquiler.FINALIZADO },
      });
    });
  }
}
