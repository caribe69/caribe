import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { Rol } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from '../auth/auth.service';
import { resolveSedeId } from '../common/sede-scope';

interface CrearPersonalInput {
  dni: string;
  nombre: string;
  apellidoPaterno: string;
  apellidoMaterno?: string;
  fechaNacimiento?: Date | null;
  fechaIngreso?: Date | null;
  correo?: string | null;
  telefono?: string | null;
  direccion?: string | null;
  cargo?: string | null;
  notas?: string | null;
  sedeId?: number | null;
}

interface FotosInput {
  fotoPerfil?: string | null;
  fotoDniFrente?: string | null;
  fotoDniReverso?: string | null;
}

@Injectable()
export class PersonalService {
  constructor(private prisma: PrismaService) {}

  async listar(user: JwtPayload, sedeIdQuery?: number) {
    const where: any = {};
    if (user.rol !== 'SUPERADMIN') {
      where.sedeId = resolveSedeId(user, sedeIdQuery);
    } else if (sedeIdQuery) {
      where.sedeId = sedeIdQuery;
    }
    return this.prisma.personal.findMany({
      where,
      include: {
        usuario: {
          select: { id: true, username: true, rol: true, activo: true },
        },
        sede: { select: { id: true, nombre: true } },
      },
      orderBy: [{ activo: 'desc' }, { apellidoPaterno: 'asc' }],
    });
  }

  async findOne(id: number) {
    const p = await this.prisma.personal.findUnique({
      where: { id },
      include: {
        usuario: {
          select: { id: true, username: true, rol: true, activo: true },
        },
        sede: { select: { id: true, nombre: true } },
      },
    });
    if (!p) throw new NotFoundException('Personal no encontrado');
    return p;
  }

  async crear(dto: CrearPersonalInput, user: JwtPayload) {
    if (!dto.dni || !dto.nombre || !dto.apellidoPaterno)
      throw new BadRequestException('Faltan datos obligatorios');

    const existing = await this.prisma.personal.findUnique({
      where: { dni: dto.dni },
    });
    if (existing)
      throw new ConflictException(`Ya existe personal con DNI ${dto.dni}`);

    const sedeId =
      user.rol === 'SUPERADMIN'
        ? dto.sedeId ?? user.sedeId ?? null
        : resolveSedeId(user, dto.sedeId ?? undefined);

    return this.prisma.personal.create({
      data: {
        ...dto,
        sedeId,
      } as any,
    });
  }

  async actualizar(id: number, dto: Partial<CrearPersonalInput>) {
    await this.findOne(id);
    return this.prisma.personal.update({
      where: { id },
      data: dto as any,
    });
  }

  async actualizarFotos(id: number, fotos: FotosInput) {
    await this.findOne(id);
    const data: any = {};
    if (fotos.fotoPerfil !== undefined) data.fotoPerfil = fotos.fotoPerfil;
    if (fotos.fotoDniFrente !== undefined)
      data.fotoDniFrente = fotos.fotoDniFrente;
    if (fotos.fotoDniReverso !== undefined)
      data.fotoDniReverso = fotos.fotoDniReverso;
    return this.prisma.personal.update({ where: { id }, data });
  }

  async eliminar(id: number) {
    await this.findOne(id);
    return this.prisma.personal.delete({ where: { id } });
  }

  /**
   * Crear usuario del sistema y vincularlo a este personal.
   * El username se autogenera a partir del DNI si no se especifica.
   */
  async crearUsuario(
    id: number,
    dto: { username?: string; password: string; rol: Rol },
  ) {
    const personal = await this.findOne(id);
    if (personal.usuarioId)
      throw new ConflictException(
        'Este personal ya tiene un usuario vinculado',
      );
    if (!dto.password || dto.password.length < 6)
      throw new BadRequestException(
        'La contraseña debe tener al menos 6 caracteres',
      );

    const username =
      dto.username?.trim() || personal.dni; // default: usar DNI

    const exists = await this.prisma.usuario.findUnique({ where: { username } });
    if (exists)
      throw new ConflictException(`El username '${username}' ya está en uso`);

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const nombreCompleto = [
      personal.nombre,
      personal.apellidoPaterno,
      personal.apellidoMaterno,
    ]
      .filter(Boolean)
      .join(' ')
      .trim();

    return this.prisma.$transaction(async (tx) => {
      const usuario = await tx.usuario.create({
        data: {
          username,
          nombre: nombreCompleto,
          email: personal.correo,
          rol: dto.rol,
          sedeId: personal.sedeId,
          passwordHash,
          activo: true,
        },
      });
      await tx.personal.update({
        where: { id },
        data: { usuarioId: usuario.id },
      });
      return { usuario, personalId: id };
    });
  }

  async desvincularUsuario(id: number) {
    const personal = await this.findOne(id);
    if (!personal.usuarioId)
      throw new BadRequestException('No tiene usuario vinculado');
    return this.prisma.personal.update({
      where: { id },
      data: { usuarioId: null },
    });
  }
}
