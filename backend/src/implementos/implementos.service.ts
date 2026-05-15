import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from '../auth/auth.service';
import { resolveSedeId } from '../common/sede-scope';

interface CrearImplementoInput {
  nombre: string;
  descripcion?: string | null;
  stockTotal?: number;
  sedeId?: number;
}

interface UpdateImplementoInput {
  nombre?: string;
  descripcion?: string | null;
  activo?: boolean;
}

@Injectable()
export class ImplementosService {
  constructor(private prisma: PrismaService) {}

  async listar(user: JwtPayload, sedeIdQuery?: number) {
    const sedeId = resolveSedeId(user, sedeIdQuery);
    return this.prisma.implemento.findMany({
      where: { sedeId, activo: true },
      orderBy: [{ nombre: 'asc' }],
    });
  }

  async findOne(id: number) {
    const i = await this.prisma.implemento.findUnique({ where: { id } });
    if (!i) throw new NotFoundException('Implemento no encontrado');
    return i;
  }

  async crear(dto: CrearImplementoInput, user: JwtPayload) {
    if (!dto.nombre) throw new BadRequestException('Nombre requerido');
    const sedeId = resolveSedeId(user, dto.sedeId);
    const stock = Math.max(0, Number(dto.stockTotal ?? 0));
    return this.prisma.implemento.create({
      data: {
        sedeId,
        nombre: dto.nombre,
        descripcion: dto.descripcion ?? null,
        stockTotal: stock,
        stockDisponible: stock,
      },
    });
  }

  async actualizar(id: number, dto: UpdateImplementoInput) {
    await this.findOne(id);
    return this.prisma.implemento.update({
      where: { id },
      data: dto as any,
    });
  }

  /**
   * Ajusta el stockTotal del implemento. Si lo subes en N, stockDisponible
   * también sube en N. Si lo bajas en N, baja en N (pero stockDisponible
   * nunca puede quedar < 0 — si hay implementos prestados que cubren la
   * diferencia, lanza error).
   */
  async ajusteStock(id: number, delta: number, motivo?: string) {
    const item = await this.findOne(id);
    if (!Number.isFinite(delta) || delta === 0)
      throw new BadRequestException('Delta inválido');
    const nuevoTotal = item.stockTotal + delta;
    const nuevoDispo = item.stockDisponible + delta;
    if (nuevoTotal < 0)
      throw new BadRequestException('stockTotal no puede ser negativo');
    if (nuevoDispo < 0)
      throw new ConflictException(
        `No se puede reducir stock: hay ${item.stockTotal - item.stockDisponible} implemento(s) prestado(s) sin devolver. Espera a que se devuelvan.`,
      );
    return this.prisma.implemento.update({
      where: { id },
      data: { stockTotal: nuevoTotal, stockDisponible: nuevoDispo },
    });
  }

  async eliminar(id: number) {
    const item = await this.findOne(id);
    if (item.stockDisponible !== item.stockTotal)
      throw new ConflictException(
        'No se puede eliminar: hay implementos prestados sin devolver',
      );
    // Borrado lógico (mantener histórico de asignaciones)
    return this.prisma.implemento.update({
      where: { id },
      data: { activo: false },
    });
  }

  /** Devolver manualmente uno o más implementos de un alquiler */
  async devolverDeAlquiler(asignacionId: number, notas?: string) {
    const asig = await this.prisma.asignacionImplemento.findUnique({
      where: { id: asignacionId },
    });
    if (!asig) throw new NotFoundException('Asignación no encontrada');
    if (asig.fechaDevolucion)
      throw new BadRequestException('Ya fue devuelto');
    return this.prisma.$transaction(async (tx) => {
      await tx.asignacionImplemento.update({
        where: { id: asignacionId },
        data: { fechaDevolucion: new Date(), notas: notas ?? null },
      });
      await tx.implemento.update({
        where: { id: asig.implementoId },
        data: { stockDisponible: { increment: asig.cantidad } },
      });
      return { ok: true };
    });
  }

  /** Listar asignaciones (filtros opcionales) */
  async listarAsignaciones(params: {
    alquilerId?: number;
    pendientes?: boolean;
    sedeId?: number;
  }) {
    const where: any = {};
    if (params.alquilerId) where.alquilerId = params.alquilerId;
    if (params.pendientes) where.fechaDevolucion = null;
    if (params.sedeId)
      where.implemento = { sedeId: params.sedeId };
    return this.prisma.asignacionImplemento.findMany({
      where,
      include: {
        implemento: { select: { id: true, nombre: true } },
        alquiler: {
          select: {
            id: true,
            clienteNombre: true,
            estado: true,
            habitacion: { select: { numero: true } },
          },
        },
      },
      orderBy: [{ fechaDevolucion: 'asc' }, { fechaAsignacion: 'desc' }],
    });
  }
}
