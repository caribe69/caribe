import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { TipoMovimiento } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from '../auth/auth.service';
import { enforceSede, resolveSedeId } from '../common/sede-scope';
import {
  CreateProductoDto,
  UpdateProductoDto,
  AjusteStockDto,
} from './producto.dto';

@Injectable()
export class ProductosService {
  constructor(private prisma: PrismaService) {}

  findAll(user: JwtPayload, sedeIdQuery?: number) {
    const sedeId = resolveSedeId(user, sedeIdQuery);
    return this.prisma.producto.findMany({
      where: { sedeId, activo: true },
      orderBy: { nombre: 'asc' },
      include: { categoria: true },
    });
  }

  /** Valida que la categoría exista y pertenezca a la sede indicada. */
  private async assertCategoria(categoriaId: number, sedeId: number) {
    const cat = await this.prisma.categoriaProducto.findUnique({
      where: { id: categoriaId },
    });
    if (!cat || !cat.activo || cat.sedeId !== sedeId) {
      throw new BadRequestException('Categoría inválida para esta sede');
    }
  }

  async findOne(id: number, user: JwtPayload) {
    const p = await this.prisma.producto.findUnique({ where: { id } });
    if (!p) throw new NotFoundException('Producto no encontrado');
    enforceSede(user, p.sedeId);
    return p;
  }

  async create(dto: CreateProductoDto, user: JwtPayload) {
    const sedeId = resolveSedeId(user, dto.sedeId);
    await this.assertCategoria(dto.categoriaId, sedeId);
    return this.prisma.producto.create({
      data: {
        sedeId,
        categoriaId: dto.categoriaId,
        nombre: dto.nombre,
        descripcion: dto.descripcion,
        precio: dto.precio,
        stock: dto.stock ?? 0,
        stockMinimo: dto.stockMinimo ?? 0,
        esCortesia: dto.esCortesia ?? false,
        cortesiaCantidad: Math.max(1, dto.cortesiaCantidad ?? 1),
      },
    });
  }

  async update(id: number, dto: UpdateProductoDto, user: JwtPayload) {
    const p = await this.findOne(id, user);
    if (typeof dto.categoriaId === 'number') {
      await this.assertCategoria(dto.categoriaId, p.sedeId);
    }
    const data: any = { ...dto };
    if (typeof dto.cortesiaCantidad === 'number') {
      data.cortesiaCantidad = Math.max(1, dto.cortesiaCantidad);
    }
    return this.prisma.producto.update({ where: { id: p.id }, data });
  }

  async ajusteStock(id: number, dto: AjusteStockDto, user: JwtPayload) {
    const p = await this.findOne(id, user);
    return this.prisma.$transaction(async (tx) => {
      const nuevoStock = p.stock + dto.cantidad;
      const actualizado = await tx.producto.update({
        where: { id: p.id },
        data: { stock: nuevoStock },
      });
      await tx.movimientoStock.create({
        data: {
          productoId: p.id,
          tipo: dto.cantidad > 0 ? TipoMovimiento.ENTRADA : TipoMovimiento.AJUSTE,
          cantidad: dto.cantidad,
          referencia: dto.motivo,
          usuarioId: user.sub,
        },
      });
      return actualizado;
    });
  }

  async remove(id: number, user: JwtPayload) {
    const p = await this.findOne(id, user);
    return this.prisma.producto.update({
      where: { id: p.id },
      data: { activo: false },
    });
  }
}
