import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSedeDto, UpdateSedeDto } from './sede.dto';

@Injectable()
export class SedesService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.sede.findMany({ orderBy: { id: 'asc' } });
  }

  async findOne(id: number) {
    const sede = await this.prisma.sede.findUnique({ where: { id } });
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

  /**
   * Marca una sede como principal. Solo puede haber UNA principal a la vez:
   * desmarca todas las demás en la misma transacción.
   */
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
}
