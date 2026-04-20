import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { JwtPayload } from '../auth/auth.service';

/**
 * Gateway de eventos en tiempo real.
 * Cada cliente se une a un room por sede (`sede:<id>`), a un room
 * por rol (`rol:<ROL>`) y a uno personal (`user:<id>`).
 *
 * El cliente debe conectar con `auth: { token: '<jwt>' }`.
 */
@Injectable()
@WebSocketGateway({
  cors: { origin: true, credentials: true },
  transports: ['websocket', 'polling'],
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger('EventsGateway');

  @WebSocketServer()
  server: Server;

  constructor(private readonly jwt: JwtService) {}

  handleConnection(client: Socket) {
    try {
      const token: string | undefined =
        client.handshake.auth?.token ||
        client.handshake.headers.authorization?.replace(/^Bearer\s+/i, '');

      if (!token) {
        client.disconnect(true);
        return;
      }

      const payload = this.jwt.verify<JwtPayload>(token);
      (client.data as { user?: JwtPayload }).user = payload;

      // Sede activa (del handshake, con fallback a la del token)
      const activeSedeId =
        Number(client.handshake.auth?.activeSedeId) || payload.sedeId;

      if (activeSedeId) client.join(`sede:${activeSedeId}`);
      if (payload.rol) client.join(`rol:${payload.rol}`);
      client.join(`user:${payload.sub}`);

      // SUPERADMIN se une a todas las sedes (recibe eventos globales)
      if (payload.rol === 'SUPERADMIN') {
        client.join('superadmin');
      }

      this.logger.log(
        `Conectado ${payload.username} (${payload.rol}) → sede:${activeSedeId}`,
      );
    } catch (err) {
      this.logger.warn(`Token inválido, desconectando`);
      client.disconnect(true);
    }
  }

  /**
   * Permite al cliente cambiar de sede sin reconectar.
   * Útil para SUPERADMIN cuando cambia en el selector.
   */
  @SubscribeMessage('switch-sede')
  handleSwitchSede(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sedeId: number },
  ) {
    const user = (client.data as { user?: JwtPayload }).user;
    if (!user) return;

    // Salir de todos los rooms sede:*
    for (const room of client.rooms) {
      if (room.startsWith('sede:')) client.leave(room);
    }
    if (data.sedeId) {
      client.join(`sede:${data.sedeId}`);
      this.logger.log(
        `${user.username} cambió a sede:${data.sedeId}`,
      );
    }
  }

  handleDisconnect(client: Socket) {
    const user = (client.data as { user?: JwtPayload }).user;
    if (user) this.logger.log(`Desconectado ${user.username}`);
  }

  /** Emite a todos los usuarios de una sede + a cualquier SUPERADMIN */
  emitToSede(sedeId: number, event: string, payload: any) {
    const body = { ...payload, sedeId };
    this.server.to(`sede:${sedeId}`).emit(event, body);
    this.server.to('superadmin').emit(event, body);
  }

  /** Emite a todos los usuarios con un rol específico de una sede */
  emitToSedeAndRol(sedeId: number, rol: string, event: string, payload: any) {
    this.server
      .to(`sede:${sedeId}`)
      .to(`rol:${rol}`)
      .emit(event, payload);
  }

  /** Emite a un usuario específico */
  emitToUser(userId: number, event: string, payload: any) {
    this.server.to(`user:${userId}`).emit(event, payload);
  }
}
