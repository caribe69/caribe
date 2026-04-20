import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from '../auth/auth.service';
import { EventsGateway } from '../events/events.gateway';

export interface SendMessageInput {
  toId: number;
  texto: string;
  tipo?: string;
  metadata?: any;
}

@Injectable()
export class ChatService {
  constructor(
    private prisma: PrismaService,
    private events: EventsGateway,
  ) {}

  async send(from: JwtPayload, dto: SendMessageInput) {
    if (!dto.toId || !dto.texto) throw new BadRequestException('toId y texto requeridos');
    if (dto.toId === from.sub) throw new BadRequestException('No puedes enviarte mensajes a ti mismo');

    const to = await this.prisma.usuario.findUnique({ where: { id: dto.toId } });
    if (!to) throw new NotFoundException('Destinatario no encontrado');

    const sedeId = from.sedeId || to.sedeId;
    if (!sedeId) throw new BadRequestException('Sin sede para enrutar el mensaje');

    // Permiso: solo dentro de la misma sede (salvo SUPERADMIN)
    if (
      from.rol !== 'SUPERADMIN' &&
      to.rol !== 'SUPERADMIN' &&
      to.sedeId !== from.sedeId
    ) {
      throw new ForbiddenException('Solo puedes chatear con usuarios de tu sede');
    }

    const mensaje = await this.prisma.mensaje.create({
      data: {
        sedeId,
        fromId: from.sub,
        toId: dto.toId,
        texto: dto.texto,
        tipo: dto.tipo || 'TEXTO',
        metadata: dto.metadata,
      },
      include: {
        from: { select: { id: true, nombre: true, username: true, rol: true } },
        to: { select: { id: true, nombre: true, username: true, rol: true } },
      },
    });

    // Emite al destinatario (room user:<id>) y al emisor (para sincronizar pestañas)
    this.events.emitToUser(dto.toId, 'chat:mensaje', mensaje);
    this.events.emitToUser(from.sub, 'chat:mensaje', mensaje);

    return mensaje;
  }

  /** Lista de conversaciones (último mensaje con cada interlocutor + no leídos) */
  async inbox(user: JwtPayload) {
    // Trae los últimos 500 mensajes donde aparece el usuario
    const mensajes = await this.prisma.mensaje.findMany({
      where: {
        OR: [{ fromId: user.sub }, { toId: user.sub }],
      },
      orderBy: { creadoEn: 'desc' },
      take: 500,
      include: {
        from: { select: { id: true, nombre: true, username: true, rol: true } },
        to: { select: { id: true, nombre: true, username: true, rol: true } },
      },
    });

    // Agrupa por interlocutor
    const byUser = new Map<
      number,
      {
        usuario: any;
        ultimo: any;
        noLeidos: number;
      }
    >();

    for (const m of mensajes) {
      const otherId = m.fromId === user.sub ? m.toId : m.fromId;
      const other = m.fromId === user.sub ? m.to : m.from;
      if (!byUser.has(otherId)) {
        byUser.set(otherId, {
          usuario: other,
          ultimo: m,
          noLeidos: 0,
        });
      }
      const entry = byUser.get(otherId)!;
      if (m.toId === user.sub && !m.leido) entry.noLeidos += 1;
    }

    return Array.from(byUser.values()).sort(
      (a, b) =>
        new Date(b.ultimo.creadoEn).getTime() -
        new Date(a.ultimo.creadoEn).getTime(),
    );
  }

  /** Mensajes con un usuario específico, ordenados ascendente */
  async conversacion(user: JwtPayload, otherUserId: number) {
    const msgs = await this.prisma.mensaje.findMany({
      where: {
        OR: [
          { fromId: user.sub, toId: otherUserId },
          { fromId: otherUserId, toId: user.sub },
        ],
      },
      orderBy: { creadoEn: 'asc' },
      take: 500,
      include: {
        from: { select: { id: true, nombre: true, username: true, rol: true } },
        to: { select: { id: true, nombre: true, username: true, rol: true } },
      },
    });
    return msgs;
  }

  async marcarLeido(user: JwtPayload, otherUserId: number) {
    const r = await this.prisma.mensaje.updateMany({
      where: { fromId: otherUserId, toId: user.sub, leido: false },
      data: { leido: true, leidoEn: new Date() },
    });
    return { marcados: r.count };
  }

  /** Lista de usuarios con los que se puede chatear (misma sede) */
  async contactos(user: JwtPayload) {
    const where: any = { activo: true, NOT: { id: user.sub } };
    if (user.rol !== 'SUPERADMIN' && user.sedeId) where.sedeId = user.sedeId;
    return this.prisma.usuario.findMany({
      where,
      select: {
        id: true,
        nombre: true,
        username: true,
        rol: true,
        sede: { select: { id: true, nombre: true } },
      },
      orderBy: { nombre: 'asc' },
    });
  }
}
