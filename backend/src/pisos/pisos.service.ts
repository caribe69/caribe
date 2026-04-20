import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from '../auth/auth.service';
import { resolveSedeId, enforceSede } from '../common/sede-scope';
import { CreatePisoDto, UpdatePisoDto } from './piso.dto';

@Injectable()
export class PisosService {
  constructor(private prisma: PrismaService) {}

  findAll(user: JwtPayload, sedeIdQuery?: number) {
    const sedeId = resolveSedeId(user, sedeIdQuery);
    return this.prisma.piso.findMany({
      where: { sedeId },
      orderBy: { numero: 'asc' },
      include: { _count: { select: { habitaciones: true } } },
    });
  }

  async create(dto: CreatePisoDto, user: JwtPayload) {
    const sedeId = resolveSedeId(user, dto.sedeId);
    return this.prisma.piso.create({
      data: { sedeId, numero: dto.numero, nombre: dto.nombre },
    });
  }

  async update(id: number, dto: UpdatePisoDto, user: JwtPayload) {
    const piso = await this.prisma.piso.findUnique({ where: { id } });
    if (!piso) throw new NotFoundException('Piso no encontrado');
    enforceSede(user, piso.sedeId);
    return this.prisma.piso.update({ where: { id }, data: dto });
  }

  async remove(id: number, user: JwtPayload) {
    const piso = await this.prisma.piso.findUnique({ where: { id } });
    if (!piso) throw new NotFoundException('Piso no encontrado');
    enforceSede(user, piso.sedeId);
    return this.prisma.piso.delete({ where: { id } });
  }
}
