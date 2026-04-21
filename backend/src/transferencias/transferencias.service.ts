import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EstadoTransferencia, TipoMovimiento } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from '../auth/auth.service';
import { resolveSedeId } from '../common/sede-scope';
import { EventsGateway } from '../events/events.gateway';
import {
  CreateTransferenciaDto,
  RechazarTransferenciaDto,
} from './transferencia.dto';

@Injectable()
export class TransferenciasService {
  constructor(
    private prisma: PrismaService,
    private events: EventsGateway,
  ) {}

  /**
   * Crea una transferencia. Solo la sede PRINCIPAL puede enviar.
   * Decrementa stock y registra movimiento SALIDA.
   */
  async create(dto: CreateTransferenciaDto, user: JwtPayload) {
    const sedeOrigenId = resolveSedeId(user);

    const origen = await this.prisma.sede.findUnique({
      where: { id: sedeOrigenId },
    });
    if (!origen)
      throw new NotFoundException('Sede origen no encontrada');
    if (!origen.esPrincipal)
      throw new ForbiddenException(
        'Solo la sede principal puede enviar productos a otras sedes',
      );

    if (dto.sedeDestinoId === sedeOrigenId)
      throw new BadRequestException(
        'La sede destino debe ser distinta a la origen',
      );

    const destino = await this.prisma.sede.findUnique({
      where: { id: dto.sedeDestinoId },
    });
    if (!destino || !destino.activa)
      throw new BadRequestException('Sede destino inválida o inactiva');

    // Validar productos + stock suficiente
    const productos = await this.prisma.producto.findMany({
      where: {
        id: { in: dto.items.map((i) => i.productoOrigenId) },
        sedeId: sedeOrigenId,
      },
    });
    if (productos.length !== dto.items.length)
      throw new BadRequestException(
        'Alguno de los productos no pertenece a la sede principal',
      );

    for (const item of dto.items) {
      const p = productos.find((x) => x.id === item.productoOrigenId);
      if (!p) continue;
      if (p.stock < item.cantidad)
        throw new ConflictException(
          `Stock insuficiente de "${p.nombre}" (${p.stock} disponible)`,
        );
    }

    const creada = await this.prisma.$transaction(async (tx) => {
      const transferencia = await tx.transferenciaSede.create({
        data: {
          sedeOrigenId,
          sedeDestinoId: dto.sedeDestinoId,
          estado: EstadoTransferencia.ENVIADA,
          notas: dto.notas,
          creadoPorId: user.sub,
          items: {
            create: dto.items.map((i) => {
              const p = productos.find((x) => x.id === i.productoOrigenId)!;
              return {
                productoOrigenId: p.id,
                nombreProducto: p.nombre,
                precio: p.precio,
                cantidad: i.cantidad,
              };
            }),
          },
        },
        include: {
          items: { include: { productoOrigen: true } },
          sedeOrigen: true,
          sedeDestino: true,
          creadoPor: { select: { id: true, nombre: true, username: true } },
        },
      });

      // Decrementar stock origen + registrar movimiento SALIDA
      for (const i of dto.items) {
        await tx.producto.update({
          where: { id: i.productoOrigenId },
          data: { stock: { decrement: i.cantidad } },
        });
        await tx.movimientoStock.create({
          data: {
            productoId: i.productoOrigenId,
            tipo: TipoMovimiento.TRANSFERENCIA_SALIDA,
            cantidad: -i.cantidad,
            referencia: `Transferencia #${transferencia.id} → ${destino.nombre}`,
            usuarioId: user.sub,
          },
        });
      }

      return transferencia;
    });

    // Notifica admins de la sede destino
    this.events.emitToSede(dto.sedeDestinoId, 'transferencia:nueva', {
      id: creada.id,
      sedeOrigen: origen.nombre,
      items: creada.items.length,
    });

    return creada;
  }

  /**
   * Lista transferencias según dirección (enviadas | recibidas | todas).
   * HOTELERO/CAJERO/LIMPIEZA: no ven nada; ADMIN_SEDE ve las de su sede;
   * SUPERADMIN ve todas.
   */
  async findAll(
    user: JwtPayload,
    direccion: 'enviadas' | 'recibidas' | 'todas' = 'todas',
    estado?: EstadoTransferencia,
  ) {
    const sedeId = resolveSedeId(user);
    const where: any = {};
    if (user.rol !== 'SUPERADMIN') {
      // Solo las que involucran mi sede activa
      const orClauses: any[] = [];
      if (direccion === 'enviadas' || direccion === 'todas')
        orClauses.push({ sedeOrigenId: sedeId });
      if (direccion === 'recibidas' || direccion === 'todas')
        orClauses.push({ sedeDestinoId: sedeId });
      where.OR = orClauses;
    } else {
      if (direccion === 'enviadas') where.sedeOrigenId = sedeId;
      if (direccion === 'recibidas') where.sedeDestinoId = sedeId;
    }
    if (estado) where.estado = estado;

    return this.prisma.transferenciaSede.findMany({
      where,
      include: {
        sedeOrigen: { select: { id: true, nombre: true } },
        sedeDestino: { select: { id: true, nombre: true } },
        creadoPor: { select: { id: true, nombre: true, username: true } },
        recibidoPor: { select: { id: true, nombre: true, username: true } },
        items: true,
      },
      orderBy: { creadoEn: 'desc' },
      take: 500,
    });
  }

  async findOne(id: number, user: JwtPayload) {
    const t = await this.prisma.transferenciaSede.findUnique({
      where: { id },
      include: {
        sedeOrigen: true,
        sedeDestino: true,
        creadoPor: { select: { id: true, nombre: true, username: true } },
        recibidoPor: { select: { id: true, nombre: true, username: true } },
        items: {
          include: {
            productoOrigen: true,
            productoDestino: true,
          },
        },
      },
    });
    if (!t) throw new NotFoundException('Transferencia no encontrada');
    const sedeId = resolveSedeId(user);
    if (
      user.rol !== 'SUPERADMIN' &&
      t.sedeOrigenId !== sedeId &&
      t.sedeDestinoId !== sedeId
    ) {
      throw new ForbiddenException(
        'No tienes acceso a esta transferencia',
      );
    }
    return t;
  }

  /**
   * Recibir la transferencia en la sede destino:
   * - Busca/crea el producto en la sede destino (por nombre)
   * - Aumenta stock y registra movimiento ENTRADA
   * - Marca la transferencia como RECIBIDA
   */
  async recibir(id: number, user: JwtPayload) {
    const t = await this.findOne(id, user);
    if (t.estado !== EstadoTransferencia.ENVIADA)
      throw new BadRequestException(
        `Transferencia en estado ${t.estado}, no se puede recibir`,
      );
    const sedeId = resolveSedeId(user);
    if (t.sedeDestinoId !== sedeId)
      throw new ForbiddenException(
        'Solo la sede destino puede marcar como recibida',
      );

    return this.prisma.$transaction(async (tx) => {
      for (const item of t.items) {
        let productoDestino = await tx.producto.findFirst({
          where: {
            sedeId: t.sedeDestinoId,
            nombre: item.nombreProducto,
            activo: true,
          },
        });
        if (!productoDestino) {
          productoDestino = await tx.producto.create({
            data: {
              sedeId: t.sedeDestinoId,
              nombre: item.nombreProducto,
              precio: item.precio,
              stock: item.cantidad,
              stockMinimo: 0,
            },
          });
        } else {
          productoDestino = await tx.producto.update({
            where: { id: productoDestino.id },
            data: { stock: { increment: item.cantidad } },
          });
        }

        // Persistir el vínculo
        await tx.transferenciaItem.update({
          where: { id: item.id },
          data: { productoDestinoId: productoDestino.id },
        });

        await tx.movimientoStock.create({
          data: {
            productoId: productoDestino.id,
            tipo: TipoMovimiento.TRANSFERENCIA_ENTRADA,
            cantidad: item.cantidad,
            referencia: `Transferencia #${t.id} desde ${t.sedeOrigen.nombre}`,
            usuarioId: user.sub,
          },
        });
      }

      const actualizada = await tx.transferenciaSede.update({
        where: { id: t.id },
        data: {
          estado: EstadoTransferencia.RECIBIDA,
          recibidoPorId: user.sub,
          recibidoEn: new Date(),
        },
        include: {
          items: true,
          sedeOrigen: true,
          sedeDestino: true,
        },
      });

      // Notifica a la sede origen que se recibió
      this.events.emitToSede(t.sedeOrigenId, 'transferencia:recibida', {
        id: t.id,
        sedeDestino: t.sedeDestino.nombre,
      });

      return actualizada;
    });
  }

  /**
   * Rechazar: devuelve el stock a la sede origen + registra motivo.
   */
  async rechazar(
    id: number,
    dto: RechazarTransferenciaDto,
    user: JwtPayload,
  ) {
    const t = await this.findOne(id, user);
    if (t.estado !== EstadoTransferencia.ENVIADA)
      throw new BadRequestException(
        `Transferencia en estado ${t.estado}, no se puede rechazar`,
      );
    const sedeId = resolveSedeId(user);
    if (t.sedeDestinoId !== sedeId && user.rol !== 'SUPERADMIN')
      throw new ForbiddenException(
        'Solo la sede destino puede rechazar',
      );

    return this.prisma.$transaction(async (tx) => {
      // Devolver stock a origen
      for (const item of t.items) {
        await tx.producto.update({
          where: { id: item.productoOrigenId },
          data: { stock: { increment: item.cantidad } },
        });
        await tx.movimientoStock.create({
          data: {
            productoId: item.productoOrigenId,
            tipo: TipoMovimiento.TRANSFERENCIA_ENTRADA,
            cantidad: item.cantidad,
            referencia: `Rechazo transferencia #${t.id}`,
            usuarioId: user.sub,
          },
        });
      }

      return tx.transferenciaSede.update({
        where: { id: t.id },
        data: {
          estado: EstadoTransferencia.RECHAZADA,
          motivoRechazo: dto.motivo,
          recibidoPorId: user.sub,
          recibidoEn: new Date(),
        },
      });
    });
  }

  /**
   * Cancelar: la sede origen anula una transferencia aún no recibida.
   */
  async cancelar(id: number, user: JwtPayload) {
    const t = await this.findOne(id, user);
    if (t.estado !== EstadoTransferencia.ENVIADA)
      throw new BadRequestException(
        `Transferencia en estado ${t.estado}, no se puede cancelar`,
      );
    const sedeId = resolveSedeId(user);
    if (t.sedeOrigenId !== sedeId && user.rol !== 'SUPERADMIN')
      throw new ForbiddenException(
        'Solo la sede origen puede cancelar',
      );

    return this.prisma.$transaction(async (tx) => {
      for (const item of t.items) {
        await tx.producto.update({
          where: { id: item.productoOrigenId },
          data: { stock: { increment: item.cantidad } },
        });
        await tx.movimientoStock.create({
          data: {
            productoId: item.productoOrigenId,
            tipo: TipoMovimiento.TRANSFERENCIA_ENTRADA,
            cantidad: item.cantidad,
            referencia: `Cancelación transferencia #${t.id}`,
            usuarioId: user.sub,
          },
        });
      }
      return tx.transferenciaSede.update({
        where: { id: t.id },
        data: { estado: EstadoTransferencia.CANCELADA },
      });
    });
  }
}
