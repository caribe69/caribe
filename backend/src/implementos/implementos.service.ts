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
import { EventsGateway } from '../events/events.gateway';

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
  /** Si se omite, la unidad queda SIN_ASIGNAR en el almacén. */
  habitacionId?: number | null;
  notas?: string | null;
}

interface UpdateUnidadInput {
  habitacionId?: number | null;
  notas?: string | null;
  activo?: boolean;
}

interface AsignarHabitacionInput {
  habitacionId: number | null;
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
  constructor(
    private prisma: PrismaService,
    private events: EventsGateway,
  ) {}

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

    const tipo = await this.prisma.tipoImplemento.findUnique({
      where: { id: dto.tipoId },
    });
    if (!tipo) throw new BadRequestException('Tipo de implemento inválido');
    enforceSede(user, tipo.sedeId);

    // Si se pasa habitacionId, validar que pertenezca a la misma sede.
    // Si no, la unidad queda SIN_ASIGNAR (en el almacén central).
    let habitacionIdValido: number | null = null;
    if (dto.habitacionId) {
      const habitacion = await this.prisma.habitacion.findUnique({
        where: { id: dto.habitacionId },
      });
      if (!habitacion) throw new BadRequestException('Habitación inválida');
      if (habitacion.sedeId !== tipo.sedeId)
        throw new BadRequestException(
          'El tipo y la habitación deben ser de la misma sede',
        );
      habitacionIdValido = habitacion.id;
    }

    try {
      return await this.prisma.implementoUnidad.create({
        data: {
          tipoId: dto.tipoId,
          codigo: dto.codigo.trim().toUpperCase(),
          habitacionId: habitacionIdValido,
          // Si la creamos sin habitación queda en el stock central; si tiene
          // habitación arranca lista para usarse.
          estado: habitacionIdValido
            ? EstadoImplementoUnidad.EN_HABITACION
            : EstadoImplementoUnidad.SIN_ASIGNAR,
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

  /**
   * Asigna una unidad a una habitación (o la desasigna pasando null).
   * Pasa la unidad a EN_HABITACION o SIN_ASIGNAR según corresponda y
   * registra el movimiento para auditoría.
   */
  async asignarAHabitacion(
    id: number,
    dto: AsignarHabitacionInput,
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

    const nuevoEstado = dto.habitacionId
      ? EstadoImplementoUnidad.EN_HABITACION
      : EstadoImplementoUnidad.SIN_ASIGNAR;

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.implementoUnidad.update({
        where: { id },
        data: {
          habitacionId: dto.habitacionId ?? null,
          estado: nuevoEstado,
        },
        include: {
          tipo: { select: { id: true, nombre: true, icono: true, color: true } },
          habitacion: { select: { id: true, numero: true } },
        },
      });
      await tx.movimientoImplemento.create({
        data: {
          unidadId: id,
          estadoAnterior: u.estado,
          estadoNuevo: nuevoEstado,
          usuarioId: user.sub,
          notas: dto.habitacionId
            ? `Asignada a habitación`
            : `Vuelta al almacén (sin asignar)`,
        },
      });
      return updated;
    });
  }

  /**
   * Resumen agregado por estado para el dashboard:
   * cuántas unidades hay en cada estado de la sede del usuario.
   */
  async resumen(user: JwtPayload, sedeIdQuery?: number) {
    const sedeId = resolveSedeId(user, sedeIdQuery);
    const grupos = await this.prisma.implementoUnidad.groupBy({
      by: ['estado'],
      where: { activo: true, tipo: { sedeId } },
      _count: { _all: true },
    });
    const resumen: Record<EstadoImplementoUnidad, number> = {
      SIN_ASIGNAR: 0,
      EN_HABITACION: 0,
      EN_TRANSITO: 0,
      EN_LAVANDERIA: 0,
      LAVADO: 0,
      PERDIDO: 0,
    };
    for (const g of grupos) {
      resumen[g.estado] = g._count._all;
    }
    const total = Object.values(resumen).reduce((s, n) => s + n, 0);
    return { total, porEstado: resumen };
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
        habitacionId:
          dto.habitacionId !== undefined ? dto.habitacionId : undefined,
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

  // ───────────────────────────────────────────────────────────
  // LAVANDERÍA (flujo del usuario LAVANDERIA)
  // ───────────────────────────────────────────────────────────

  /**
   * El lavandero marca un conjunto de unidades SUCIAS como YA LAVADAS.
   * Estado: EN_LAVANDERIA → LAVADO. Sigue en la lavandería pero ya lista
   * para devolverse a las habitaciones.
   */
  async marcarComoLavado(
    unidadIds: number[],
    user: JwtPayload,
    notas?: string,
  ) {
    if (!Array.isArray(unidadIds) || unidadIds.length === 0)
      return { actualizados: 0 };

    const result = await this.prisma.$transaction(async (tx) => {
      const unidades = await tx.implementoUnidad.findMany({
        where: { id: { in: unidadIds } },
        include: { tipo: true },
      });
      for (const u of unidades) enforceSede(user, u.tipo.sedeId);

      let actualizados = 0;
      const sedesAfectadas = new Set<number>();
      for (const u of unidades) {
        if (u.estado !== EstadoImplementoUnidad.EN_LAVANDERIA) continue;
        await tx.implementoUnidad.update({
          where: { id: u.id },
          data: { estado: EstadoImplementoUnidad.LAVADO },
        });
        await tx.movimientoImplemento.create({
          data: {
            unidadId: u.id,
            estadoAnterior: u.estado,
            estadoNuevo: EstadoImplementoUnidad.LAVADO,
            usuarioId: user.sub,
            notas: notas ?? null,
          },
        });
        actualizados++;
        sedesAfectadas.add(u.tipo.sedeId);
      }
      return { actualizados, sedesAfectadas };
    });

    // Notificar a cada sede afectada (admin/hotelero ven el toast en vivo)
    for (const sedeId of result.sedesAfectadas) {
      this.events.emitToSede(sedeId, 'lavanderia:lavado', {
        cantidad: result.actualizados,
        porUsuario: user.username,
      });
    }
    return { actualizados: result.actualizados };
  }

  /**
   * El lavandero entrega unidades LAVADAS de vuelta a sus habitaciones.
   * Cada unidad vuelve EXCLUSIVAMENTE a su habitación original (la que
   * tiene asignada en `habitacionId`). Pasan a EN_HABITACION.
   */
  async entregarAHabitaciones(
    unidadIds: number[],
    user: JwtPayload,
    notas?: string,
  ) {
    if (!Array.isArray(unidadIds) || unidadIds.length === 0)
      return { actualizados: 0, sinHabitacion: 0 };

    const result = await this.prisma.$transaction(async (tx) => {
      const unidades = await tx.implementoUnidad.findMany({
        where: { id: { in: unidadIds } },
        include: { tipo: true, habitacion: { select: { numero: true } } },
      });
      for (const u of unidades) enforceSede(user, u.tipo.sedeId);

      let actualizados = 0;
      let sinHabitacion = 0;
      // Para notificar al frontend cuántas vuelven a cada habitación
      const porHabitacion = new Map<string, number>();
      const sedesAfectadas = new Set<number>();
      for (const u of unidades) {
        if (u.estado !== EstadoImplementoUnidad.LAVADO) continue;
        if (!u.habitacionId) {
          await tx.implementoUnidad.update({
            where: { id: u.id },
            data: { estado: EstadoImplementoUnidad.SIN_ASIGNAR },
          });
          sinHabitacion++;
        } else {
          await tx.implementoUnidad.update({
            where: { id: u.id },
            data: { estado: EstadoImplementoUnidad.EN_HABITACION },
          });
          actualizados++;
          const habNum = u.habitacion?.numero ?? '?';
          porHabitacion.set(habNum, (porHabitacion.get(habNum) || 0) + 1);
        }
        await tx.movimientoImplemento.create({
          data: {
            unidadId: u.id,
            estadoAnterior: u.estado,
            estadoNuevo: u.habitacionId
              ? EstadoImplementoUnidad.EN_HABITACION
              : EstadoImplementoUnidad.SIN_ASIGNAR,
            usuarioId: user.sub,
            notas: notas ?? null,
          },
        });
        sedesAfectadas.add(u.tipo.sedeId);
      }
      return { actualizados, sinHabitacion, porHabitacion, sedesAfectadas };
    });

    // Notificar: "María entregó 5 implementos a habitaciones 102, 103, 201"
    const habitacionesArr = Array.from(result.porHabitacion.keys()).sort();
    for (const sedeId of result.sedesAfectadas) {
      this.events.emitToSede(sedeId, 'lavanderia:entregado', {
        cantidad: result.actualizados,
        habitaciones: habitacionesArr,
        porUsuario: user.username,
      });
    }
    return {
      actualizados: result.actualizados,
      sinHabitacion: result.sinHabitacion,
    };
  }

  /**
   * Estadísticas de lavandería para el usuario actual.
   * Cuántas unidades marcó como LAVADO en distintas ventanas:
   * hoy, esta semana, este mes.
   */
  async estadisticasLavanderia(user: JwtPayload) {
    // Bug fix: si user.sedeId es null el filtro Prisma quedaba como
    // `sedeId: undefined` (Prisma ignora undefined) → la lavandera vería
    // pendientes de TODAS las sedes. Exigimos sede explícita.
    if (user.sedeId == null) {
      throw new BadRequestException(
        'Tu usuario no tiene sede asignada. Pedile al admin que te asigne una sede en el panel de Usuarios.',
      );
    }

    const ahora = new Date();
    const inicioHoy = new Date(ahora);
    inicioHoy.setHours(0, 0, 0, 0);

    const inicioSemana = new Date(inicioHoy);
    // Lunes como inicio (en Perú la semana se cuenta así)
    const diaSemana = (inicioSemana.getDay() + 6) % 7; // 0=Lunes
    inicioSemana.setDate(inicioSemana.getDate() - diaSemana);

    const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1);

    const baseWhere = {
      usuarioId: user.sub,
      estadoNuevo: EstadoImplementoUnidad.LAVADO,
    };

    const [hoy, semana, mes, totalEnLavanderia, totalLavados] =
      await Promise.all([
        this.prisma.movimientoImplemento.count({
          where: { ...baseWhere, fecha: { gte: inicioHoy } },
        }),
        this.prisma.movimientoImplemento.count({
          where: { ...baseWhere, fecha: { gte: inicioSemana } },
        }),
        this.prisma.movimientoImplemento.count({
          where: { ...baseWhere, fecha: { gte: inicioMes } },
        }),
        // Pendientes de lavar AHORA (sucios) en la sede del usuario
        this.prisma.implementoUnidad.count({
          where: {
            estado: EstadoImplementoUnidad.EN_LAVANDERIA,
            activo: true,
            tipo: { sedeId: user.sedeId },
          },
        }),
        // Lavados pero aún no entregados
        this.prisma.implementoUnidad.count({
          where: {
            estado: EstadoImplementoUnidad.LAVADO,
            activo: true,
            tipo: { sedeId: user.sedeId },
          },
        }),
      ]);

    return {
      lavadosPorMi: { hoy, semana, mes },
      pendientes: {
        sucios: totalEnLavanderia,
        lavados: totalLavados,
      },
    };
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
