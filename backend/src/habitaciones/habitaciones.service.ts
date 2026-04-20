import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EstadoHabitacion } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from '../auth/auth.service';
import { resolveSedeId, enforceSede } from '../common/sede-scope';
import {
  CreateHabitacionDto,
  UpdateHabitacionDto,
  CambiarEstadoDto,
} from './habitacion.dto';

@Injectable()
export class HabitacionesService {
  constructor(private prisma: PrismaService) {}

  findAll(user: JwtPayload, sedeIdQuery?: number, estado?: EstadoHabitacion) {
    const sedeId = resolveSedeId(user, sedeIdQuery);
    return this.prisma.habitacion.findMany({
      where: {
        sedeId,
        ...(estado ? { estado } : {}),
        activa: true,
      },
      include: { piso: true },
      orderBy: [{ pisoId: 'asc' }, { numero: 'asc' }],
    });
  }

  async findOne(id: number, user: JwtPayload) {
    const h = await this.prisma.habitacion.findUnique({
      where: { id },
      include: { piso: true },
    });
    if (!h) throw new NotFoundException('Habitación no encontrada');
    enforceSede(user, h.sedeId);
    return h;
  }

  async create(dto: CreateHabitacionDto, user: JwtPayload) {
    const sedeId = resolveSedeId(user, dto.sedeId);
    const piso = await this.prisma.piso.findUnique({
      where: { id: dto.pisoId },
    });
    if (!piso || piso.sedeId !== sedeId)
      throw new BadRequestException('Piso no pertenece a esta sede');

    return this.prisma.habitacion.create({
      data: {
        sedeId,
        pisoId: dto.pisoId,
        numero: dto.numero,
        descripcion: dto.descripcion,
        caracteristicas: dto.caracteristicas,
        precioHora: dto.precioHora,
        precioNoche: dto.precioNoche,
      },
    });
  }

  async update(id: number, dto: UpdateHabitacionDto, user: JwtPayload) {
    const h = await this.findOne(id, user);
    return this.prisma.habitacion.update({
      where: { id: h.id },
      data: dto,
    });
  }

  async cambiarEstado(id: number, dto: CambiarEstadoDto, user: JwtPayload) {
    const h = await this.findOne(id, user);
    return this.prisma.habitacion.update({
      where: { id: h.id },
      data: { estado: dto.estado },
    });
  }

  async remove(id: number, user: JwtPayload) {
    const h = await this.findOne(id, user);
    return this.prisma.habitacion.update({
      where: { id: h.id },
      data: { activa: false },
    });
  }
}
