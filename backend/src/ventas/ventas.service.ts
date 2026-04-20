import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  EstadoTurno,
  EstadoVenta,
  TipoMovimiento,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from '../auth/auth.service';
import { enforceSede, resolveSedeId } from '../common/sede-scope';
import { AnularVentaDto, CreateVentaDto } from './venta.dto';

@Injectable()
export class VentasService {
  constructor(private prisma: PrismaService) {}

  findAll(user: JwtPayload, sedeIdQuery?: number, estado?: EstadoVenta) {
    const sedeId = resolveSedeId(user, sedeIdQuery);
    return this.prisma.venta.findMany({
      where: { sedeId, ...(estado ? { estado } : {}) },
      include: {
        items: { include: { producto: true } },
        usuario: { select: { id: true, nombre: true, username: true } },
      },
      orderBy: { creadoEn: 'desc' },
      take: 200,
    });
  }

  async findOne(id: number, user: JwtPayload) {
    const v = await this.prisma.venta.findUnique({
      where: { id },
      include: {
        items: { include: { producto: true } },
        usuario: { select: { id: true, nombre: true, username: true } },
        anuladoPor: { select: { id: true, nombre: true, username: true } },
      },
    });
    if (!v) throw new NotFoundException('Venta no encontrada');
    enforceSede(user, v.sedeId);
    return v;
  }

  async create(dto: CreateVentaDto, user: JwtPayload) {
    if (!dto.items?.length)
      throw new BadRequestException('Debe incluir al menos un producto');

    const sedeId = resolveSedeId(user, dto.sedeId);

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

    // Validar productos + stock
    const ids = dto.items.map((i) => i.productoId);
    const productos = await this.prisma.producto.findMany({
      where: { id: { in: ids }, sedeId },
    });
    if (productos.length !== ids.length)
      throw new BadRequestException('Algún producto no pertenece a esta sede');

    const productoMap = new Map(productos.map((p) => [p.id, p]));
    let total = 0;
    for (const it of dto.items) {
      const p = productoMap.get(it.productoId);
      if (!p) throw new BadRequestException('Producto inválido');
      if (p.stock < it.cantidad)
        throw new ConflictException(`Stock insuficiente: ${p.nombre}`);
      total += Number(p.precio) * it.cantidad;
    }

    return this.prisma.$transaction(async (tx) => {
      const venta = await tx.venta.create({
        data: {
          sedeId,
          turnoCajaId: turno.id,
          usuarioId: user.sub,
          metodoPago: dto.metodoPago,
          notas: dto.notas,
          total,
          items: {
            create: dto.items.map((it) => {
              const p = productoMap.get(it.productoId)!;
              const precioUnit = Number(p.precio);
              return {
                productoId: p.id,
                cantidad: it.cantidad,
                precioUnit,
                subtotal: precioUnit * it.cantidad,
              };
            }),
          },
        },
        include: { items: { include: { producto: true } } },
      });

      // Descontar stock + movimientos
      for (const it of dto.items) {
        await tx.producto.update({
          where: { id: it.productoId },
          data: { stock: { decrement: it.cantidad } },
        });
        await tx.movimientoStock.create({
          data: {
            productoId: it.productoId,
            tipo: TipoMovimiento.SALIDA_VENTA,
            cantidad: -it.cantidad,
            referencia: `Venta directa #${venta.id}`,
            usuarioId: user.sub,
          },
        });
      }

      return venta;
    });
  }

  async anular(id: number, dto: AnularVentaDto, user: JwtPayload) {
    const venta = await this.findOne(id, user);
    if (venta.estado === EstadoVenta.ANULADA)
      throw new BadRequestException('Ya anulada');
    if (!dto.motivo || dto.motivo.length < 3)
      throw new BadRequestException('Motivo requerido');

    return this.prisma.$transaction(async (tx) => {
      for (const it of venta.items) {
        await tx.producto.update({
          where: { id: it.productoId },
          data: { stock: { increment: it.cantidad } },
        });
        await tx.movimientoStock.create({
          data: {
            productoId: it.productoId,
            tipo: TipoMovimiento.ANULACION,
            cantidad: it.cantidad,
            referencia: `Anulación venta #${venta.id}`,
            usuarioId: user.sub,
          },
        });
      }
      return tx.venta.update({
        where: { id: venta.id },
        data: {
          estado: EstadoVenta.ANULADA,
          anuladoEn: new Date(),
          anuladoPorId: user.sub,
          motivoAnulacion: dto.motivo,
        },
      });
    });
  }
}
