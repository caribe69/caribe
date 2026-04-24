import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface AuditEntry {
  usuarioId?: number | null;
  username?: string | null;
  rol?: string | null;
  sedeId?: number | null;
  accion: string;
  recurso?: string | null;
  recursoId?: string | null;
  metodo?: string | null;
  path?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  detalle?: any;
  ok?: boolean;
  statusCode?: number | null;
  duracionMs?: number | null;
}

@Injectable()
export class AuditService {
  private readonly log = new Logger(AuditService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Inserta un registro de auditoría. Siempre "fire and forget": nunca
   * debe romper la request del usuario si falla el log.
   */
  async record(entry: AuditEntry) {
    try {
      await this.prisma.auditLog.create({
        data: {
          usuarioId: entry.usuarioId ?? null,
          username: entry.username ?? null,
          rol: entry.rol ?? null,
          sedeId: entry.sedeId ?? null,
          accion: entry.accion,
          recurso: entry.recurso ?? null,
          recursoId: entry.recursoId ?? null,
          metodo: entry.metodo ?? null,
          path: entry.path ?? null,
          ip: entry.ip ?? null,
          userAgent: entry.userAgent ?? null,
          detalle: entry.detalle ?? undefined,
          ok: entry.ok ?? true,
          statusCode: entry.statusCode ?? null,
          duracionMs: entry.duracionMs ?? null,
        },
      });
    } catch (err) {
      // No bloquear la operación del usuario si falla el log
      this.log.warn(`No se pudo guardar audit log: ${String(err)}`);
    }
  }

  /** Consulta con filtros y paginación */
  async listar(params: {
    desde?: Date;
    hasta?: Date;
    usuarioId?: number;
    accion?: string;
    recurso?: string;
    ok?: boolean;
    q?: string;
    page?: number;
    size?: number;
  }) {
    const page = Math.max(1, params.page ?? 1);
    const size = Math.min(200, Math.max(1, params.size ?? 30));
    const skip = (page - 1) * size;

    const where: any = {};
    if (params.desde || params.hasta) {
      where.creadoEn = {};
      if (params.desde) where.creadoEn.gte = params.desde;
      if (params.hasta) where.creadoEn.lte = params.hasta;
    }
    if (params.usuarioId) where.usuarioId = params.usuarioId;
    if (params.accion) where.accion = params.accion;
    if (params.recurso) where.recurso = params.recurso;
    if (params.ok !== undefined) where.ok = params.ok;
    if (params.q) {
      where.OR = [
        { username: { contains: params.q, mode: 'insensitive' } },
        { path: { contains: params.q, mode: 'insensitive' } },
        { ip: { contains: params.q, mode: 'insensitive' } },
        { recurso: { contains: params.q, mode: 'insensitive' } },
      ];
    }

    const [total, rows] = await Promise.all([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.findMany({
        where,
        orderBy: { creadoEn: 'desc' },
        take: size,
        skip,
      }),
    ]);

    // BigInt → string para JSON
    const items = rows.map((r) => ({ ...r, id: r.id.toString() }));
    return { items, total, page, size };
  }

  /** Opciones para filtros (valores distintos usados) */
  async facets() {
    const [acciones, recursos] = await Promise.all([
      this.prisma.auditLog.findMany({
        distinct: ['accion'],
        select: { accion: true },
        orderBy: { accion: 'asc' },
      }),
      this.prisma.auditLog.findMany({
        distinct: ['recurso'],
        where: { recurso: { not: null } },
        select: { recurso: true },
        orderBy: { recurso: 'asc' },
      }),
    ]);
    return {
      acciones: acciones.map((a) => a.accion),
      recursos: recursos.map((r) => r.recurso).filter(Boolean) as string[],
    };
  }
}
