import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EstadoImplementoUnidad } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from '../auth/auth.service';
import { enforceSede, resolveSedeId } from '../common/sede-scope';

interface CrearTipoInput {
  nombre: string;
  icono?: string | null;
  color?: string | null;
  sedeId?: number;
}

interface UpdateTipoInput {
  nombre?: string;
  icono?: string | null;
  color?: string | null;
  activo?: boolean;
}

interface CrearUnidadInput {
  tipoId: number;
  codigo: string;
  habitacionId: number;
  notas?: string | null;
}

interface UpdateUnidadInput {
  habitacionId?: number;
  notas?: string | null;
  activo?: boolean;
}

/**
 * Sistema de implementos por habitación.
 *
 * El modelo viejo (Implemento + AsignacionImplemento) queda en el schema
 * por compatibilidad pero NO se usa más. Ahora cada habitación tiene un
 * conjunto de ImplementoUnidad (cada toalla, sábana, control con código
 * único) y cambian de estado a medida que pasan por el ciclo de lavandería.
 */
@Injectable()
export class ImplementosService {
  constructor(private prisma: PrismaService) {}

  // ───────────────────────────────────────────────────────────
  // TIPOS DE IMPLEMENTO (catálogo por sede)
  // ───────────────────────────────────────────────────────────

  async listarTipos(user: JwtPayload, sedeIdQuery?: number) {
    const sedeId = resolveSedeId(user, sedeIdQuery);
    return this.prisma.tipoImplemento.findMany({
      where: { sedeId, activo: true },
      include: {
        _count: { select: { unidades: { where: { activo: true } } } },
      },
      orderBy: [{ nombre: 'asc' }],
    });
  }

  async crearTipo(dto: CrearTipoInput, user: JwtPayload) {
    if (!dto.nombre?.trim())
      throw new BadRequestException('Nombre requerido');
    const sedeId = resolveSedeId(user, dto.sedeId);
    try {
      return await this.prisma.tipoImplemento.create({
        data: {
          sedeId,
          nombre: dto.nombre.trim(),
          icono: dto.icono?.trim() || null,
          color: dto.color?.trim() || null,
        },
      });
    } catch (e: any) {
      if (e?.code === 'P2002')
        throw new ConflictException(
          `Ya existe un tipo "${dto.nombre}" en esta sede`,
        );
      throw e;
    }
  }

  async actualizarTipo(id: number, dto: UpdateTipoInput, user: JwtPayload) {
    const tipo = await this.prisma.tipoImplemento.findUnique({
      where: { id },
    });
    if (!tipo) throw new NotFoundException('Tipo no encontrado');
    enforceSede(user, tipo.sedeId);
    return this.prisma.tipoImplemento.update({
      where: { id },
      data: {
        nombre: dto.nombre?.trim() ?? undefined,
        icono: dto.icono !== undefined ? dto.icono?.trim() || null : undefined,
        color: dto.color !== undefined ? dto.color?.trim() || null : undefined,
        activo: dto.activo ?? undefined,
      },
    });
  }

  async eliminarTipo(id: number, user: JwtPayload) {
    const tipo = await this.prisma.tipoImplemento.findUnique({
      where: { id },
      include: { _count: { select: { unidades: { where: { activo: true } } } } },
    });
    if (!tipo) throw new NotFoundException('Tipo no encontrado');
    enforceSede(user, tipo.sedeId);
    if (tipo._count.unidades > 0)
      throw new ConflictException(
        `No se puede eliminar: hay ${tipo._count.unidades} unidades activas de este tipo. Eliminalas o desactivalas primero.`,
      );
    return this.prisma.tipoImplemento.update({
      where: { id },
      data: { activo: false },
    });
  }

  // ───────────────────────────────────────────────────────────
  // UNIDADES (cada implemento individual con código único)
  // ───────────────────────────────────────────────────────────

  /**
   * Lista unidades con filtros opcionales:
   * - sedeIdQuery: filtra por sede
   * - habitacionId: solo de esa habitación
   * - estado: solo en este estado (EN_HABITACION, EN_LAVANDERIA, etc.)
   * - tipoId: solo de este tipo
   */
  async listarUnidades(
    user: JwtPayload,
    filtros: {
      sedeId?: number;
      habitacionId?: number;
      estado?: EstadoImplementoUnidad;
      tipoId?: number;
    },
  ) {
    const sedeId = resolveSedeId(user, filtros.sedeId);
    const where: any = {
      activo: true,
      tipo: { sedeId },
    };
    if (filtros.habitacionId) where.habitacionId = filtros.habitacionId;
    if (filtros.estado) where.estado = filtros.estado;
    if (filtros.tipoId) where.tipoId = filtros.tipoId;
    return this.prisma.implementoUnidad.findMany({
      where,
      include: {
        tipo: { select: { id: true, nombre: true, icono: true, color: true } },
        habitacion: { select: { id: true, numero: true } },
      },
      orderBy: [{ habitacionId: 'asc' }, { codigo: 'asc' }],
    });
  }

  async crearUnidad(dto: CrearUnidadInput, user: JwtPayload) {
    if (!dto.codigo?.trim())
      throw new BadRequestException('Código requerido');

    // Validar que el tipo y la habitación existan y pertenezcan a la sede
    const [tipo, habitacion] = await Promise.all([
      this.prisma.tipoImplemento.findUnique({ where: { id: dto.tipoId } }),
      this.prisma.habitacion.findUnique({ where: { id: dto.habitacionId } }),
    ]);
    if (!tipo) throw new BadRequestException('Tipo de implemento inválido');
    if (!habitacion) throw new BadRequestException('Habitación inválida');
    if (tipo.sedeId !== habitacion.sedeId)
      throw new BadRequestException(
        'El tipo y la habitación deben ser de la misma sede',
      );
    enforceSede(user, tipo.sedeId);

    try {
      return await this.prisma.implementoUnidad.create({
        data: {
          tipoId: dto.tipoId,
          codigo: dto.codigo.trim().toUpperCase(),
          habitacionId: dto.habitacionId,
          notas: dto.notas?.trim() || null,
        },
        include: {
          tipo: { select: { id: true, nombre: true, icono: true, color: true } },
          habitacion: { select: { id: true, numero: true } },
        },
      });
    } catch (e: any) {
      if (e?.code === 'P2002')
        throw new ConflictException(
          `Ya existe una unidad con código "${dto.codigo}"`,
        );
      throw e;
    }
  }

  async actualizarUnidad(
    id: number,
    dto: UpdateUnidadInput,
    user: JwtPayload,
  ) {
    const u = await this.prisma.implementoUnidad.findUnique({
      where: { id },
      include: { tipo: true },
    });
    if (!u) throw new NotFoundException('Unidad no encontrada');
    enforceSede(user, u.tipo.sedeId);

    if (dto.habitacionId) {
      const hab = await this.prisma.habitacion.findUnique({
        where: { id: dto.habitacionId },
      });
      if (!hab || hab.sedeId !== u.tipo.sedeId)
        throw new BadRequestException(
          'La habitación debe ser de la misma sede que el tipo',
        );
    }

    return this.prisma.implementoUnidad.update({
      where: { id },
      data: {
        habitacionId: dto.habitacionId ?? undefined,
        notas: dto.notas !== undefined ? dto.notas?.trim() || null : undefined,
        activo: dto.activo ?? undefined,
      },
    });
  }

  async eliminarUnidad(id: number, user: JwtPayload) {
    const u = await this.prisma.implementoUnidad.findUnique({
      where: { id },
      include: { tipo: true },
    });
    if (!u) throw new NotFoundException('Unidad no encontrada');
    enforceSede(user, u.tipo.sedeId);
    return this.prisma.implementoUnidad.update({
      where: { id },
      data: { activo: false },
    });
  }

  // ───────────────────────────────────────────────────────────
  // CAMBIOS DE ESTADO (lavandería, retorno, etc.)
  // ───────────────────────────────────────────────────────────

  /**
   * Marca un conjunto de unidades como EN_TRANSITO → EN_LAVANDERIA.
   * Lo usa la limpiadora al completar la tarea de limpieza de una hab.
   *
   * Si tareaLimpiezaId está presente, queda registrado en el movimiento
   * para auditoría.
   */
  async marcarALavanderia(
    unidadIds: number[],
    user: JwtPayload,
    tareaLimpiezaId?: number,
    notas?: string,
  ) {
    if (!Array.isArray(unidadIds) || unidadIds.length === 0)
      return { actualizados: 0 };

    return this.prisma.$transaction(async (tx) => {
      // Validar que todas pertenecen a una sede accesible
      const unidades = await tx.implementoUnidad.findMany({
        where: { id: { in: unidadIds } },
        include: { tipo: true },
      });
      for (const u of unidades) enforceSede(user, u.tipo.sedeId);

      let actualizados = 0;
      for (const u of unidades) {
        if (u.estado === EstadoImplementoUnidad.EN_LAVANDERIA) continue; // ya está
        await tx.implementoUnidad.update({
          where: { id: u.id },
          data: { estado: EstadoImplementoUnidad.EN_LAVANDERIA },
        });
        await tx.movimientoImplemento.create({
          data: {
            unidadId: u.id,
            estadoAnterior: u.estado,
            estadoNuevo: EstadoImplementoUnidad.EN_LAVANDERIA,
            usuarioId: user.sub,
            tareaLimpiezaId: tareaLimpiezaId ?? null,
            notas: notas ?? null,
          },
        });
        actualizados++;
      }
      return { actualizados };
    });
  }

  /**
   * Confirma que un conjunto de unidades volvió limpia de lavandería.
   * Las pasa a EN_HABITACION (vuelven a su habitación original).
   *
   * Lo usa el admin/hotelero desde la web.
   */
  async retornarDeLavanderia(
    unidadIds: number[],
    user: JwtPayload,
    notas?: string,
  ) {
    if (!Array.isArray(unidadIds) || unidadIds.length === 0)
      return { actualizados: 0 };

    return this.prisma.$transaction(async (tx) => {
      const unidades = await tx.implementoUnidad.findMany({
        where: { id: { in: unidadIds } },
        include: { tipo: true },
      });
      for (const u of unidades) enforceSede(user, u.tipo.sedeId);

      let actualizados = 0;
      for (const u of unidades) {
        if (u.estado === EstadoImplementoUnidad.EN_HABITACION) continue;
        await tx.implementoUnidad.update({
          where: { id: u.id },
          data: { estado: EstadoImplementoUnidad.EN_HABITACION },
        });
        await tx.movimientoImplemento.create({
          data: {
            unidadId: u.id,
            estadoAnterior: u.estado,
            estadoNuevo: EstadoImplementoUnidad.EN_HABITACION,
            usuarioId: user.sub,
            notas: notas ?? null,
          },
        });
        actualizados++;
      }
      return { actualizados };
    });
  }

  /** Marca una unidad como PERDIDA (no aparece en su habitación ni en lavandería) */
  async marcarPerdido(id: number, user: JwtPayload, notas?: string) {
    const u = await this.prisma.implementoUnidad.findUnique({
      where: { id },
      include: { tipo: true },
    });
    if (!u) throw new NotFoundException('Unidad no encontrada');
    enforceSede(user, u.tipo.sedeId);
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.implementoUnidad.update({
        where: { id },
        data: { estado: EstadoImplementoUnidad.PERDIDO },
      });
      await tx.movimientoImplemento.create({
        data: {
          unidadId: id,
          estadoAnterior: u.estado,
          estadoNuevo: EstadoImplementoUnidad.PERDIDO,
          usuarioId: user.sub,
          notas: notas?.trim() || 'Marcado como perdido',
        },
      });
      return updated;
    });
  }

  /** Historial de movimientos de una unidad específica */
  async historialUnidad(id: number, user: JwtPayload) {
    const u = await this.prisma.implementoUnidad.findUnique({
      where: { id },
      include: { tipo: true },
    });
    if (!u) throw new NotFoundException('Unidad no encontrada');
    enforceSede(user, u.tipo.sedeId);
    return this.prisma.movimientoImplemento.findMany({
      where: { unidadId: id },
      include: {
        usuario: { select: { id: true, nombre: true, username: true } },
        tareaLimpieza: {
          select: { id: true, habitacion: { select: { numero: true } } },
        },
      },
      orderBy: { fecha: 'desc' },
    });
  }
}
