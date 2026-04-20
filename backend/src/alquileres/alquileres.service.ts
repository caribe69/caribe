import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  EstadoAlquiler,
  EstadoHabitacion,
  EstadoTareaLimpieza,
  EstadoTurno,
  MetodoPago,
  TipoMovimiento,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from '../auth/auth.service';
import { enforceSede, resolveSedeId } from '../common/sede-scope';
import {
  AgregarConsumoDto,
  AnularAlquilerDto,
  CreateAlquilerDto,
  FinalizarAlquilerDto,
} from './alquiler.dto';

@Injectable()
export class AlquileresService {
  constructor(private prisma: PrismaService) {}

  findAll(
    user: JwtPayload,
    sedeIdQuery?: number,
    estado?: EstadoAlquiler,
  ) {
    const sedeId = resolveSedeId(user, sedeIdQuery);
    return this.prisma.alquiler.findMany({
      where: { sedeId, ...(estado ? { estado } : {}) },
      include: {
        habitacion: { include: { piso: true } },
        consumos: { include: { producto: true } },
        creadoPor: { select: { id: true, nombre: true, username: true } },
      },
      orderBy: { creadoEn: 'desc' },
      take: 200,
    });
  }

  /** Historial completo con rango de fechas para reportes */
  async historial(
    user: JwtPayload,
    desde: string | undefined,
    hasta: string | undefined,
    sedeIdQuery?: number,
  ) {
    const sedeId = resolveSedeId(user, sedeIdQuery);
    const where: any = { sedeId };
    // HOTELERO / CAJERO solo ven sus propios alquileres
    if (user.rol !== 'SUPERADMIN' && user.rol !== 'ADMIN_SEDE') {
      where.creadoPorId = user.sub;
    }
    if (desde || hasta) {
      where.creadoEn = {};
      if (desde) where.creadoEn.gte = new Date(desde);
      if (hasta) {
        const h = new Date(hasta);
        h.setHours(23, 59, 59, 999);
        where.creadoEn.lte = h;
      }
    }
    return this.prisma.alquiler.findMany({
      where,
      include: {
        habitacion: { include: { piso: true } },
        sede: { select: { nombre: true } },
        consumos: { include: { producto: true } },
        creadoPor: { select: { nombre: true, username: true } },
      },
      orderBy: { creadoEn: 'desc' },
      take: 5000,
    });
  }

  async findOne(id: number, user: JwtPayload) {
    const a = await this.prisma.alquiler.findUnique({
      where: { id },
      include: {
        habitacion: { include: { piso: true } },
        consumos: { include: { producto: true } },
        creadoPor: { select: { id: true, nombre: true, username: true } },
        anuladoPor: { select: { id: true, nombre: true, username: true } },
      },
    });
    if (!a) throw new NotFoundException('Alquiler no encontrado');
    enforceSede(user, a.sedeId);
    return a;
  }

  async create(dto: CreateAlquilerDto, user: JwtPayload) {
    const sedeId = resolveSedeId(user, dto.sedeId);

    const hab = await this.prisma.habitacion.findUnique({
      where: { id: dto.habitacionId },
    });
    if (!hab || hab.sedeId !== sedeId)
      throw new BadRequestException('Habitación inválida');
    if (hab.estado !== EstadoHabitacion.DISPONIBLE)
      throw new ConflictException(
        `Habitación no disponible (estado: ${hab.estado})`,
      );

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

    return this.prisma.$transaction(async (tx) => {
      const alquiler = await tx.alquiler.create({
        data: {
          sedeId,
          habitacionId: hab.id,
          turnoCajaId: turno.id,
          clienteNombre: dto.clienteNombre,
          clienteDni: dto.clienteDni,
          clienteTelefono: dto.clienteTelefono,
          fechaIngreso: new Date(dto.fechaIngreso),
          fechaSalida: new Date(dto.fechaSalida),
          precioHabitacion: dto.precioHabitacion,
          total: dto.precioHabitacion,
          metodoPago: dto.metodoPago,
          notas: dto.notas,
          creadoPorId: user.sub,
        },
      });

      await tx.habitacion.update({
        where: { id: hab.id },
        data: { estado: EstadoHabitacion.OCUPADA },
      });

      return alquiler;
    });
  }

  async agregarConsumo(
    alquilerId: number,
    dto: AgregarConsumoDto,
    user: JwtPayload,
  ) {
    const alquiler = await this.findOne(alquilerId, user);
    if (alquiler.estado !== EstadoAlquiler.ACTIVO)
      throw new BadRequestException('Alquiler no está activo');

    const producto = await this.prisma.producto.findUnique({
      where: { id: dto.productoId },
    });
    if (!producto || producto.sedeId !== alquiler.sedeId)
      throw new BadRequestException('Producto inválido');
    if (producto.stock < dto.cantidad)
      throw new ConflictException('Stock insuficiente');

    const precioUnit = Number(producto.precio);
    const subtotal = precioUnit * dto.cantidad;

    return this.prisma.$transaction(async (tx) => {
      const consumo = await tx.consumoProducto.create({
        data: {
          alquilerId: alquiler.id,
          productoId: producto.id,
          cantidad: dto.cantidad,
          precioUnit,
          subtotal,
        },
      });

      await tx.producto.update({
        where: { id: producto.id },
        data: { stock: producto.stock - dto.cantidad },
      });

      await tx.movimientoStock.create({
        data: {
          productoId: producto.id,
          tipo: TipoMovimiento.SALIDA_VENTA,
          cantidad: -dto.cantidad,
          referencia: `Alquiler #${alquiler.id}`,
          usuarioId: user.sub,
        },
      });

      const totalProductosActual =
        Number(alquiler.totalProductos) + subtotal;
      const totalGeneral = Number(alquiler.precioHabitacion) + totalProductosActual;

      await tx.alquiler.update({
        where: { id: alquiler.id },
        data: {
          totalProductos: totalProductosActual,
          total: totalGeneral,
        },
      });

      return consumo;
    });
  }

  async finalizar(id: number, dto: FinalizarAlquilerDto, user: JwtPayload) {
    const alquiler = await this.findOne(id, user);
    if (alquiler.estado !== EstadoAlquiler.ACTIVO)
      throw new BadRequestException('Alquiler no está activo');

    return this.prisma.$transaction(async (tx) => {
      const act = await tx.alquiler.update({
        where: { id: alquiler.id },
        data: {
          estado: EstadoAlquiler.FINALIZADO,
          fechaSalidaReal: new Date(),
          notas: dto?.notas ?? alquiler.notas,
        },
      });

      // Auto-transición: OCUPADA -> ALISTANDO + crear tarea de limpieza
      await tx.habitacion.update({
        where: { id: alquiler.habitacionId },
        data: { estado: EstadoHabitacion.ALISTANDO },
      });

      // Auto-asignación: elige el usuario de LIMPIEZA activo con menos tareas pendientes
      const limpiadoras = await tx.usuario.findMany({
        where: {
          sedeId: alquiler.sedeId,
          rol: 'LIMPIEZA',
          activo: true,
        },
        select: {
          id: true,
          _count: {
            select: {
              tareasAsignadas: {
                where: {
                  estado: {
                    in: [
                      EstadoTareaLimpieza.PENDIENTE,
                      EstadoTareaLimpieza.EN_PROCESO,
                    ],
                  },
                },
              },
            },
          },
        },
      });

      let asignadaAId: number | null = null;
      if (limpiadoras.length > 0) {
        limpiadoras.sort(
          (a, b) => a._count.tareasAsignadas - b._count.tareasAsignadas,
        );
        asignadaAId = limpiadoras[0].id;
      }

      await tx.tareaLimpieza.create({
        data: {
          sedeId: alquiler.sedeId,
          habitacionId: alquiler.habitacionId,
          estado: EstadoTareaLimpieza.PENDIENTE,
          notas: `Post-alquiler #${alquiler.id}`,
          asignadaAId,
        },
      });

      return act;
    });
  }

  async anular(id: number, dto: AnularAlquilerDto, user: JwtPayload) {
    const alquiler = await this.findOne(id, user);
    if (alquiler.estado === EstadoAlquiler.ANULADO)
      throw new BadRequestException('Ya anulado');
    if (!dto.motivo || dto.motivo.length < 3)
      throw new BadRequestException('Motivo requerido');

    return this.prisma.$transaction(async (tx) => {
      for (const c of alquiler.consumos) {
        await tx.producto.update({
          where: { id: c.productoId },
          data: { stock: { increment: c.cantidad } },
        });
        await tx.movimientoStock.create({
          data: {
            productoId: c.productoId,
            tipo: TipoMovimiento.ANULACION,
            cantidad: c.cantidad,
            referencia: `Anulación alquiler #${alquiler.id}`,
            usuarioId: user.sub,
          },
        });
      }

      const act = await tx.alquiler.update({
        where: { id: alquiler.id },
        data: {
          estado: EstadoAlquiler.ANULADO,
          anuladoEn: new Date(),
          anuladoPorId: user.sub,
          motivoAnulacion: dto.motivo,
        },
      });

      // Libera habitación si estaba ocupada por este alquiler
      await tx.habitacion.update({
        where: { id: alquiler.habitacionId },
        data: { estado: EstadoHabitacion.DISPONIBLE },
      });

      return act;
    });
  }
}
