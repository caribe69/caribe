import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EstadoAlquiler, Rol, TipoMovimiento } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from '../auth/auth.service';
import { EventsGateway } from '../events/events.gateway';
import { ChatService } from '../chat/chat.service';

@Injectable()
export class AnulacionesService {
  constructor(
    private prisma: PrismaService,
    private events: EventsGateway,
    private chat: ChatService,
  ) {}

  async solicitar(user: JwtPayload, alquilerId: number, motivo: string) {
    if (!motivo || motivo.trim().length < 3)
      throw new BadRequestException('El motivo debe tener al menos 3 caracteres');

    const alquiler = await this.prisma.alquiler.findUnique({
      where: { id: alquilerId },
    });
    if (!alquiler) throw new NotFoundException('Alquiler no encontrado');
    if (user.sedeId && alquiler.sedeId !== user.sedeId)
      throw new ForbiddenException('Fuera de tu sede');
    if (alquiler.estado === EstadoAlquiler.ANULADO)
      throw new BadRequestException('El alquiler ya está anulado');

    // Check que no haya otra solicitud pendiente para el mismo alquiler
    const existente = await this.prisma.anulacionRequest.findFirst({
      where: { alquilerId, estado: 'PENDIENTE' },
    });
    if (existente)
      throw new BadRequestException(
        'Ya existe una solicitud pendiente para este alquiler',
      );

    const req = await this.prisma.anulacionRequest.create({
      data: {
        sedeId: alquiler.sedeId,
        alquilerId,
        solicitanteId: user.sub,
        motivo,
      },
      include: {
        solicitante: { select: { id: true, nombre: true, username: true, rol: true } },
        alquiler: {
          select: {
            id: true,
            clienteNombre: true,
            total: true,
            habitacion: { select: { numero: true } },
          },
        },
      },
    });

    // Envía mensaje de chat a TODOS los admins de la sede + superadmins
    const admins = await this.prisma.usuario.findMany({
      where: {
        activo: true,
        OR: [
          { rol: Rol.SUPERADMIN },
          { rol: Rol.ADMIN_SEDE, sedeId: alquiler.sedeId },
        ],
      },
    });

    const mensajeTexto = `Solicita anular alquiler #${req.alquiler.id} · Hab. ${req.alquiler.habitacion.numero} · ${req.alquiler.clienteNombre} · S/ ${Number(req.alquiler.total).toFixed(2)}\nMotivo: ${motivo}`;

    for (const admin of admins) {
      await this.chat.send(user, {
        toId: admin.id,
        texto: mensajeTexto,
        tipo: 'ANULACION_REQUEST',
        metadata: {
          anulacionId: req.id,
          alquilerId: req.alquilerId,
          habitacionNumero: req.alquiler.habitacion.numero,
          clienteNombre: req.alquiler.clienteNombre,
          total: Number(req.alquiler.total),
          motivo,
        },
      });
    }

    // Socket event para badge de pendientes
    this.events.emitToSede(alquiler.sedeId, 'anulacion:solicitada', {
      anulacionId: req.id,
      alquilerId: req.alquilerId,
      habitacionNumero: req.alquiler.habitacion.numero,
      solicitante: req.solicitante.nombre,
      motivo,
    });

    return req;
  }

  async listar(user: JwtPayload, sedeIdQuery?: number, estado?: string) {
    const sedeId =
      user.rol === 'SUPERADMIN'
        ? sedeIdQuery || user.sedeId
        : user.sedeId;
    if (!sedeId) throw new ForbiddenException('Sin sede');

    const where: any = { sedeId };
    if (estado) where.estado = estado;
    // HOTELERO/CAJERO solo ven las suyas; admins ven todas
    if (user.rol !== 'SUPERADMIN' && user.rol !== 'ADMIN_SEDE')
      where.solicitanteId = user.sub;

    return this.prisma.anulacionRequest.findMany({
      where,
      include: {
        solicitante: { select: { id: true, nombre: true, username: true } },
        aprobador: { select: { id: true, nombre: true, username: true } },
        alquiler: {
          select: {
            id: true,
            clienteNombre: true,
            clienteDni: true,
            total: true,
            habitacion: { select: { numero: true } },
          },
        },
      },
      orderBy: { creadoEn: 'desc' },
    });
  }

  async aprobar(user: JwtPayload, id: number, respuesta?: string) {
    if (user.rol !== 'SUPERADMIN' && user.rol !== 'ADMIN_SEDE')
      throw new ForbiddenException('Solo ADMIN_SEDE/SUPERADMIN pueden aprobar');

    const req = await this.prisma.anulacionRequest.findUnique({
      where: { id },
      include: { alquiler: { include: { consumos: true } } },
    });
    if (!req) throw new NotFoundException('Solicitud no encontrada');
    if (user.sedeId && req.sedeId !== user.sedeId && user.rol !== 'SUPERADMIN')
      throw new ForbiddenException('Fuera de tu sede');
    if (req.estado !== 'PENDIENTE')
      throw new BadRequestException('Ya fue resuelta');

    // Ejecuta la anulación del alquiler (revierte stock, libera habitación)
    await this.prisma.$transaction(async (tx) => {
      for (const c of req.alquiler.consumos) {
        await tx.producto.update({
          where: { id: c.productoId },
          data: { stock: { increment: c.cantidad } },
        });
        await tx.movimientoStock.create({
          data: {
            productoId: c.productoId,
            tipo: TipoMovimiento.ANULACION,
            cantidad: c.cantidad,
            referencia: `Aprobación anulación #${req.id}`,
            usuarioId: user.sub,
          },
        });
      }

      await tx.alquiler.update({
        where: { id: req.alquilerId },
        data: {
          estado: EstadoAlquiler.ANULADO,
          anuladoEn: new Date(),
          anuladoPorId: user.sub,
          motivoAnulacion: req.motivo,
        },
      });

      await tx.habitacion.update({
        where: { id: req.alquiler.habitacionId },
        data: { estado: 'DISPONIBLE' },
      });

      await tx.anulacionRequest.update({
        where: { id: req.id },
        data: {
          estado: 'APROBADA',
          aprobadorId: user.sub,
          respuestaAdmin: respuesta,
          respondidoEn: new Date(),
        },
      });
    });

    // Chat + socket al solicitante
    await this.chat.send(user, {
      toId: req.solicitanteId,
      texto: `✅ Anulación aprobada · Alquiler #${req.alquilerId} anulado.${respuesta ? `\n${respuesta}` : ''}`,
      tipo: 'ANULACION_APROBADA',
      metadata: { anulacionId: req.id, alquilerId: req.alquilerId },
    });

    this.events.emitToSede(req.sedeId, 'anulacion:respondida', {
      anulacionId: req.id,
      alquilerId: req.alquilerId,
      estado: 'APROBADA',
    });

    return this.prisma.anulacionRequest.findUnique({ where: { id: req.id } });
  }

  async rechazar(user: JwtPayload, id: number, respuesta?: string) {
    if (user.rol !== 'SUPERADMIN' && user.rol !== 'ADMIN_SEDE')
      throw new ForbiddenException('Solo ADMIN_SEDE/SUPERADMIN');

    const req = await this.prisma.anulacionRequest.findUnique({ where: { id } });
    if (!req) throw new NotFoundException('Solicitud no encontrada');
    if (user.sedeId && req.sedeId !== user.sedeId && user.rol !== 'SUPERADMIN')
      throw new ForbiddenException('Fuera de tu sede');
    if (req.estado !== 'PENDIENTE')
      throw new BadRequestException('Ya fue resuelta');

    const updated = await this.prisma.anulacionRequest.update({
      where: { id },
      data: {
        estado: 'RECHAZADA',
        aprobadorId: user.sub,
        respuestaAdmin: respuesta,
        respondidoEn: new Date(),
      },
    });

    await this.chat.send(user, {
      toId: req.solicitanteId,
      texto: `❌ Anulación rechazada · Alquiler #${req.alquilerId} sigue activo.${respuesta ? `\n${respuesta}` : ''}`,
      tipo: 'ANULACION_RECHAZADA',
      metadata: { anulacionId: req.id, alquilerId: req.alquilerId },
    });

    this.events.emitToSede(req.sedeId, 'anulacion:respondida', {
      anulacionId: req.id,
      alquilerId: req.alquilerId,
      estado: 'RECHAZADA',
    });

    return updated;
  }
}
