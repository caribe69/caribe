import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from '../auth/auth.service';
import { enforceSede, resolveSedeId } from '../common/sede-scope';
import {
  CreateCategoriaProductoDto,
  UpdateCategoriaProductoDto,
} from './categoria-producto.dto';

@Injectable()
export class CategoriasProductosService {
  constructor(private prisma: PrismaService) {}

  findAll(user: JwtPayload, sedeIdQuery?: number) {
    const sedeId = resolveSedeId(user, sedeIdQuery);
    return this.prisma.categoriaProducto.findMany({
      where: { sedeId, activo: true },
      orderBy: [{ orden: 'asc' }, { nombre: 'asc' }],
      include: {
        _count: { select: { productos: { where: { activo: true } } } },
      },
    });
  }

  async findOne(id: number, user: JwtPayload) {
    const c = await this.prisma.categoriaProducto.findUnique({ where: { id } });
    if (!c) throw new NotFoundException('Categoría no encontrada');
    enforceSede(user, c.sedeId);
    return c;
  }

  create(dto: CreateCategoriaProductoDto, user: JwtPayload) {
    const sedeId = resolveSedeId(user, dto.sedeId);
    return this.prisma.categoriaProducto.create({
      data: {
        sedeId,
        nombre: dto.nombre.trim(),
        orden: dto.orden ?? 0,
      },
    });
  }

  async update(id: number, dto: UpdateCategoriaProductoDto, user: JwtPayload) {
    const c = await this.findOne(id, user);
    const data: any = {};
    if (typeof dto.nombre === 'string') data.nombre = dto.nombre.trim();
    if (typeof dto.orden === 'number') data.orden = dto.orden;
    return this.prisma.categoriaProducto.update({
      where: { id: c.id },
      data,
    });
  }

  async remove(id: number, user: JwtPayload) {
    const c = await this.findOne(id, user);
    // No permitir borrar si tiene productos activos asignados: obligaría a
    // dejarlos sin categoría, y las categorías son obligatorias.
    const enUso = await this.prisma.producto.count({
      where: { categoriaId: c.id, activo: true },
    });
    if (enUso > 0) {
      throw new BadRequestException(
        `No se puede eliminar: ${enUso} producto(s) activo(s) usan esta categoría. Reasígnalos primero.`,
      );
    }
    return this.prisma.categoriaProducto.update({
      where: { id: c.id },
      data: { activo: false },
    });
  }
}
