import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  EstadoAlquiler,
  EstadoTurno,
  MetodoPago,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from '../auth/auth.service';
import { enforceSede, resolveSedeId } from '../common/sede-scope';

@Injectable()
export class CajaService {
  constructor(private prisma: PrismaService) {}

  async turnoAbierto(user: JwtPayload) {
    return this.prisma.turnoCaja.findFirst({
      where: {
        usuarioId: user.sub,
        estado: EstadoTurno.ABIERTO,
      },
      include: { sede: { select: { id: true, nombre: true } } },
    });
  }

  async abrir(user: JwtPayload, sedeIdBody?: number) {
    const sedeId = resolveSedeId(user, sedeIdBody);
    const abierto = await this.prisma.turnoCaja.findFirst({
      where: { usuarioId: user.sub, estado: EstadoTurno.ABIERTO },
    });
    if (abierto)
      throw new BadRequestException('Ya tienes un turno abierto');

    return this.prisma.turnoCaja.create({
      data: { sedeId, usuarioId: user.sub },
    });
  }

  async cerrar(id: number, user: JwtPayload, notas?: string) {
    const turno = await this.prisma.turnoCaja.findUnique({
      where: { id },
      include: {
        alquileres: {
          where: { estado: { not: EstadoAlquiler.ANULADO } },
          include: { consumos: true },
        },
      },
    });
    if (!turno) throw new NotFoundException('Turno no encontrado');
    enforceSede(user, turno.sedeId);
    if (turno.usuarioId !== user.sub)
      throw new BadRequestException('No puedes cerrar turno de otro usuario');
    if (turno.estado === EstadoTurno.CERRADO)
      throw new BadRequestException('Turno ya cerrado');

    const totales = {
      EFECTIVO: 0,
      VISA: 0,
      MASTERCARD: 0,
      YAPE: 0,
      PLIN: 0,
      OTRO: 0,
    };
    let total = 0;
    for (const a of turno.alquileres) {
      const t = Number(a.total);
      totales[a.metodoPago] += t;
      total += t;
    }

    return this.prisma.turnoCaja.update({
      where: { id: turno.id },
      data: {
        estado: EstadoTurno.CERRADO,
        cerradoEn: new Date(),
        totalEfectivo: totales.EFECTIVO,
        totalVisa: totales.VISA,
        totalMaster: totales.MASTERCARD,
        totalYape: totales.YAPE,
        totalPlin: totales.PLIN,
        totalOtro: totales.OTRO,
        totalGeneral: total,
        notas,
      },
    });
  }

  async reporte(id: number, user: JwtPayload) {
    const turno = await this.prisma.turnoCaja.findUnique({
      where: { id },
      include: {
        usuario: { select: { id: true, nombre: true, username: true } },
        sede: { select: { id: true, nombre: true } },
        alquileres: {
          include: {
            habitacion: true,
            consumos: { include: { producto: true } },
          },
          orderBy: { creadoEn: 'asc' },
        },
      },
    });
    if (!turno) throw new NotFoundException('Turno no encontrado');
    enforceSede(user, turno.sedeId);

    const productosVendidos: Record<
      number,
      { nombre: string; cantidad: number; total: number }
    > = {};
    for (const a of turno.alquileres) {
      if (a.estado === EstadoAlquiler.ANULADO) continue;
      for (const c of a.consumos) {
        const k = c.productoId;
        if (!productosVendidos[k]) {
          productosVendidos[k] = {
            nombre: c.producto.nombre,
            cantidad: 0,
            total: 0,
          };
        }
        productosVendidos[k].cantidad += c.cantidad;
        productosVendidos[k].total += Number(c.subtotal);
      }
    }

    return {
      turno,
      productosVendidos: Object.values(productosVendidos),
    };
  }

  async listarTurnos(user: JwtPayload, sedeIdQuery?: number) {
    const sedeId = resolveSedeId(user, sedeIdQuery);
    return this.prisma.turnoCaja.findMany({
      where: { sedeId },
      include: {
        usuario: { select: { id: true, nombre: true, username: true } },
      },
      orderBy: { abiertoEn: 'desc' },
      take: 100,
    });
  }
}
