import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  EstadoAlquiler,
  EstadoHabitacion,
  EstadoTareaLimpieza,
  Rol,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from '../auth/auth.service';
import { resolveSedeId, enforceSede } from '../common/sede-scope';
import {
  CreateHabitacionDto,
  UpdateHabitacionDto,
  CambiarEstadoDto,
} from './habitacion.dto';

@Injectable()
export class HabitacionesService {
  constructor(private prisma: PrismaService) {}

  async findAll(
    user: JwtPayload,
    sedeIdQuery?: number,
    estado?: EstadoHabitacion,
  ) {
    const sedeId = resolveSedeId(user, sedeIdQuery);
    const habitaciones = await this.prisma.habitacion.findMany({
      where: {
        sedeId,
        ...(estado ? { estado } : {}),
        activa: true,
      },
      include: {
        piso: true,
        fotos: {
          orderBy: [{ orden: 'asc' }, { id: 'asc' }],
          take: 10,
        },
        // Alquiler activo (si está OCUPADA)
        alquileres: {
          where: {
            estado: { in: [EstadoAlquiler.ACTIVO, EstadoAlquiler.FINALIZADO] },
          },
          orderBy: { creadoEn: 'desc' },
          take: 1,
          select: {
            id: true,
            estado: true,
            clienteNombre: true,
            clienteDni: true,
            clienteFechaNacimiento: true,
            fechaIngreso: true,
            fechaSalida: true,
            fechaSalidaReal: true,
            total: true,
            totalProductos: true,
            precioHabitacion: true,
            creadoEn: true,
            pagado: true,
            montoPagado: true,
            amenitiesEntregados: true,
            tipoComprobante: true,
            clienteRuc: true,
          },
        },
      },
      orderBy: [{ pisoId: 'asc' }, { numero: 'asc' }],
    });
    return habitaciones;
  }

  async findOne(id: number, user: JwtPayload) {
    const h = await this.prisma.habitacion.findUnique({
      where: { id },
      include: { piso: true },
    });
    if (!h) throw new NotFoundException('Habitación no encontrada');
    enforceSede(user, h.sedeId);
    return h;
  }

  async create(dto: CreateHabitacionDto, user: JwtPayload) {
    const sedeId = resolveSedeId(user, dto.sedeId);
    const piso = await this.prisma.piso.findUnique({
      where: { id: dto.pisoId },
    });
    if (!piso || piso.sedeId !== sedeId)
      throw new BadRequestException('Piso no pertenece a esta sede');

    return this.prisma.habitacion.create({
      data: {
        sedeId,
        pisoId: dto.pisoId,
        numero: dto.numero,
        descripcion: dto.descripcion,
        caracteristicas: dto.caracteristicas,
        precioHora: dto.precioHora,
        precioNoche: dto.precioNoche,
      },
    });
  }

  async update(id: number, dto: UpdateHabitacionDto, user: JwtPayload) {
    const h = await this.findOne(id, user);
    return this.prisma.habitacion.update({
      where: { id: h.id },
      data: dto,
    });
  }

  async cambiarEstado(id: number, dto: CambiarEstadoDto, user: JwtPayload) {
    const h = await this.findOne(id, user);

    return this.prisma.$transaction(async (tx) => {
      const actualizada = await tx.habitacion.update({
        where: { id: h.id },
        data: { estado: dto.estado },
      });

      // Al pasar a ALISTANDO: crear tarea de limpieza auto-asignada
      // si no existe ya una tarea pendiente/en proceso para esta habitación.
      if (dto.estado === EstadoHabitacion.ALISTANDO) {
        const yaExiste = await tx.tareaLimpieza.findFirst({
          where: {
            habitacionId: h.id,
            estado: {
              in: [
                EstadoTareaLimpieza.PENDIENTE,
                EstadoTareaLimpieza.EN_PROCESO,
              ],
            },
          },
        });
        if (!yaExiste) {
          const limpiadoras = await tx.usuario.findMany({
            where: {
              sedeId: h.sedeId,
              rol: Rol.LIMPIEZA,
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
              sedeId: h.sedeId,
              habitacionId: h.id,
              estado: EstadoTareaLimpieza.PENDIENTE,
              notas: `Cambio manual a ALISTANDO`,
              asignadaAId,
            },
          });
        }
      }

      return actualizada;
    });
  }

  async remove(id: number, user: JwtPayload) {
    const h = await this.findOne(id, user);
    return this.prisma.habitacion.update({
      where: { id: h.id },
      data: { activa: false },
    });
  }

  // ────────── FOTOS ──────────

  async listarFotos(habitacionId: number, user: JwtPayload) {
    const h = await this.findOne(habitacionId, user);
    return this.prisma.fotoHabitacion.findMany({
      where: { habitacionId: h.id },
      orderBy: [{ orden: 'asc' }, { id: 'asc' }],
    });
  }

  async subirFoto(
    habitacionId: number,
    filename: string,
    user: JwtPayload,
  ) {
    const h = await this.findOne(habitacionId, user);
    // Orden: si hay menos de 4 fotos, va como principal (el siguiente hueco)
    // si ya hay 4+, va como extra (orden creciente desde 5)
    const total = await this.prisma.fotoHabitacion.count({
      where: { habitacionId: h.id },
    });
    const orden = total < 4 ? total + 1 : 5 + (total - 4);
    return this.prisma.fotoHabitacion.create({
      data: {
        habitacionId: h.id,
        path: `/uploads/habitaciones/${filename}`,
        orden,
      },
    });
  }

  async eliminarFoto(
    habitacionId: number,
    fotoId: number,
    user: JwtPayload,
  ) {
    const h = await this.findOne(habitacionId, user);
    const foto = await this.prisma.fotoHabitacion.findUnique({
      where: { id: fotoId },
    });
    if (!foto || foto.habitacionId !== h.id)
      throw new NotFoundException('Foto no encontrada');
    await this.prisma.fotoHabitacion.delete({ where: { id: fotoId } });
    return { ok: true };
  }

  async reordenarFotos(
    habitacionId: number,
    orden: number[],
    user: JwtPayload,
  ) {
    const h = await this.findOne(habitacionId, user);
    // orden es un array de ids en el orden deseado
    const fotos = await this.prisma.fotoHabitacion.findMany({
      where: { habitacionId: h.id },
    });
    const ids = new Set(fotos.map((f) => f.id));
    for (const id of orden) {
      if (!ids.has(id))
        throw new BadRequestException('Foto no pertenece a esta habitación');
    }
    await this.prisma.$transaction(
      orden.map((fotoId, idx) =>
        this.prisma.fotoHabitacion.update({
          where: { id: fotoId },
          data: { orden: idx + 1 },
        }),
      ),
    );
    return this.listarFotos(habitacionId, user);
  }
}
