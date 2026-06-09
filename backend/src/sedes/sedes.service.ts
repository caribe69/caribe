import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSedeDto, UpdateSedeDto } from './sede.dto';
import { promises as fs } from 'fs';
import { join } from 'path';

@Injectable()
export class SedesService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.sede.findMany({
      orderBy: { id: 'asc' },
      include: { fotos: { orderBy: { orden: 'asc' } } },
    });
  }

  async findOne(id: number) {
    const sede = await this.prisma.sede.findUnique({
      where: { id },
      include: { fotos: { orderBy: { orden: 'asc' } } },
    });
    if (!sede) throw new NotFoundException('Sede no encontrada');
    return sede;
  }

  create(dto: CreateSedeDto) {
    return this.prisma.sede.create({ data: dto });
  }

  async update(id: number, dto: UpdateSedeDto) {
    await this.findOne(id);
    return this.prisma.sede.update({ where: { id }, data: dto });
  }

  async toggleActiva(id: number) {
    const sede = await this.findOne(id);
    return this.prisma.sede.update({
      where: { id },
      data: { activa: !sede.activa },
    });
  }

  async setPrincipal(id: number) {
    await this.findOne(id);
    return this.prisma.$transaction(async (tx) => {
      await tx.sede.updateMany({
        where: { esPrincipal: true, NOT: { id } },
        data: { esPrincipal: false },
      });
      return tx.sede.update({
        where: { id },
        data: { esPrincipal: true },
      });
    });
  }

  // ────────────────────────────────────────────────────────────
  // Fotos
  // ────────────────────────────────────────────────────────────
  async listarFotos(sedeId: number) {
    await this.findOne(sedeId);
    return this.prisma.fotoSede.findMany({
      where: { sedeId },
      orderBy: { orden: 'asc' },
    });
  }

  async subirFotos(sedeId: number, files: Express.Multer.File[]) {
    await this.findOne(sedeId);
    if (!files || files.length === 0) {
      throw new BadRequestException('Subí al menos una foto');
    }
    const existentes = await this.prisma.fotoSede.count({ where: { sedeId } });
    const creadas: { id: number; path: string; orden: number }[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const foto = await this.prisma.fotoSede.create({
        data: {
          sedeId,
          path: `/uploads/sedes/${file.filename}`,
          orden: existentes + i,
        },
      });
      creadas.push({ id: foto.id, path: foto.path, orden: foto.orden });
    }
    return creadas;
  }

  async eliminarFoto(sedeId: number, fotoId: number) {
    const foto = await this.prisma.fotoSede.findFirst({
      where: { id: fotoId, sedeId },
    });
    if (!foto) throw new NotFoundException('Foto no encontrada');
    try {
      const filePath = join(process.cwd(), foto.path.replace(/^\/+/, ''));
      await fs.unlink(filePath).catch(() => {});
    } catch {
      // ignorar errores de borrado en disco
    }
    await this.prisma.fotoSede.delete({ where: { id: fotoId } });
    return { ok: true };
  }
}
