import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface SlideInput {
  titulo?: string | null;
  subtitulo?: string | null;
  descripcion?: string | null;
  precio?: string | null;
  beneficios?: string | null;
  botonTexto?: string | null;
  botonUrl?: string | null;
  orden?: number;
  activo?: boolean;
}

@Injectable()
export class LandingService {
  constructor(private prisma: PrismaService) {}

  /** Todos los slides (admin), ordenados. */
  listar() {
    return this.prisma.landingSlide.findMany({
      orderBy: [{ orden: 'asc' }, { id: 'asc' }],
    });
  }

  /** Slides activos para la landing pública. */
  publicos() {
    return this.prisma.landingSlide.findMany({
      where: { activo: true },
      orderBy: [{ orden: 'asc' }, { id: 'asc' }],
    });
  }

  async crear(dto: SlideInput) {
    const max = await this.prisma.landingSlide.aggregate({
      _max: { orden: true },
    });
    return this.prisma.landingSlide.create({
      data: {
        titulo: dto.titulo ?? null,
        subtitulo: dto.subtitulo ?? null,
        descripcion: dto.descripcion ?? null,
        precio: dto.precio ?? null,
        beneficios: dto.beneficios ?? null,
        botonTexto: dto.botonTexto ?? null,
        botonUrl: dto.botonUrl ?? null,
        orden: dto.orden ?? (max._max.orden ?? 0) + 1,
        activo: dto.activo ?? true,
      },
    });
  }

  async actualizar(id: number, dto: SlideInput) {
    await this.findOne(id);
    return this.prisma.landingSlide.update({ where: { id }, data: dto as any });
  }

  async setImagen(id: number, path: string) {
    await this.findOne(id);
    return this.prisma.landingSlide.update({
      where: { id },
      data: { imagen: path },
    });
  }

  async findOne(id: number) {
    const s = await this.prisma.landingSlide.findUnique({ where: { id } });
    if (!s) throw new NotFoundException('Slide no encontrado');
    return s;
  }

  async eliminar(id: number) {
    await this.findOne(id);
    await this.prisma.landingSlide.delete({ where: { id } });
    return { ok: true };
  }

  /** Reordena: recibe la lista de ids en el nuevo orden. */
  async reordenar(ids: number[]) {
    if (!Array.isArray(ids) || ids.length === 0)
      throw new BadRequestException('Lista de ids vacía');
    await this.prisma.$transaction(
      ids.map((id, i) =>
        this.prisma.landingSlide.update({ where: { id }, data: { orden: i } }),
      ),
    );
    return this.listar();
  }
}
