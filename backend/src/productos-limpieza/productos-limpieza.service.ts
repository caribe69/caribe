import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from '../auth/auth.service';
import { enforceSede, resolveSedeId } from '../common/sede-scope';
import {
  CreateProductoLimpiezaDto,
  UpdateProductoLimpiezaDto,
  AjusteStockLimpiezaDto,
} from './producto-limpieza.dto';

@Injectable()
export class ProductosLimpiezaService {
  constructor(private prisma: PrismaService) {}

  findAll(user: JwtPayload, sedeIdQuery?: number) {
    const sedeId = resolveSedeId(user, sedeIdQuery);
    return this.prisma.productoLimpieza.findMany({
      where: { sedeId, activo: true },
      orderBy: { nombre: 'asc' },
    });
  }

  async findOne(id: number, user: JwtPayload) {
    const p = await this.prisma.productoLimpieza.findUnique({ where: { id } });
    if (!p) throw new NotFoundException('Producto de limpieza no encontrado');
    enforceSede(user, p.sedeId);
    return p;
  }

  create(dto: CreateProductoLimpiezaDto, user: JwtPayload) {
    const sedeId = resolveSedeId(user, dto.sedeId);
    return this.prisma.productoLimpieza.create({
      data: {
        sedeId,
        nombre: dto.nombre,
        descripcion: dto.descripcion,
        stock: dto.stock ?? 0,
        stockMinimo: dto.stockMinimo ?? 0,
        unidad: dto.unidad ?? 'unidad',
      },
    });
  }

  async update(id: number, dto: UpdateProductoLimpiezaDto, user: JwtPayload) {
    const p = await this.findOne(id, user);
    return this.prisma.productoLimpieza.update({
      where: { id: p.id },
      data: dto,
    });
  }

  async ajusteStock(id: number, dto: AjusteStockLimpiezaDto, user: JwtPayload) {
    const p = await this.findOne(id, user);
    return this.prisma.productoLimpieza.update({
      where: { id: p.id },
      data: { stock: p.stock + dto.cantidad },
    });
  }

  async remove(id: number, user: JwtPayload) {
    const p = await this.findOne(id, user);
    return this.prisma.productoLimpieza.update({
      where: { id: p.id },
      data: { activo: false },
    });
  }
}
