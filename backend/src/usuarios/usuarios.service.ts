import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Rol } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from '../auth/auth.service';
import { JwtPayload } from '../auth/auth.service';
import { CreateUsuarioDto, UpdateUsuarioDto } from './usuario.dto';

@Injectable()
export class UsuariosService {
  constructor(
    private prisma: PrismaService,
    private auth: AuthService,
  ) {}

  private scopeSede(currentUser: JwtPayload): { sedeId?: number } {
    if (currentUser.rol === Rol.SUPERADMIN) return {};
    if (!currentUser.sedeId)
      throw new ForbiddenException('Usuario sin sede asignada');
    return { sedeId: currentUser.sedeId };
  }

  async findAll(currentUser: JwtPayload) {
    const where = this.scopeSede(currentUser);
    return this.prisma.usuario.findMany({
      where,
      select: {
        id: true,
        nombre: true,
        username: true,
        email: true,
        rol: true,
        sedeId: true,
        activo: true,
        creadoEn: true,
        sede: { select: { id: true, nombre: true } },
      },
      orderBy: { id: 'asc' },
    });
  }

  async create(dto: CreateUsuarioDto, currentUser: JwtPayload) {
    if (dto.rol === Rol.SUPERADMIN && currentUser.rol !== Rol.SUPERADMIN)
      throw new ForbiddenException('Solo SUPERADMIN puede crear SUPERADMIN');

    let sedeId = dto.sedeId ?? null;
    if (currentUser.rol !== Rol.SUPERADMIN) {
      if (!currentUser.sedeId) throw new ForbiddenException('Sin sede');
      sedeId = currentUser.sedeId;
    }
    if (dto.rol !== Rol.SUPERADMIN && !sedeId)
      throw new BadRequestException('sedeId es obligatorio para este rol');

    const exists = await this.prisma.usuario.findUnique({
      where: { username: dto.username },
    });
    if (exists) throw new BadRequestException('Username ya existe');

    const passwordHash = await this.auth.hashPassword(dto.password);

    return this.prisma.usuario.create({
      data: {
        nombre: dto.nombre,
        username: dto.username,
        email: dto.email,
        passwordHash,
        rol: dto.rol,
        sedeId,
      },
      select: {
        id: true,
        nombre: true,
        username: true,
        email: true,
        rol: true,
        sedeId: true,
        activo: true,
      },
    });
  }

  async update(id: number, dto: UpdateUsuarioDto, currentUser: JwtPayload) {
    const user = await this.prisma.usuario.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    if (
      currentUser.rol !== Rol.SUPERADMIN &&
      user.sedeId !== currentUser.sedeId
    )
      throw new ForbiddenException('Fuera de tu sede');

    const data: any = { ...dto };
    if (dto.password) {
      data.passwordHash = await this.auth.hashPassword(dto.password);
      delete data.password;
    }
    return this.prisma.usuario.update({
      where: { id },
      data,
      select: {
        id: true,
        nombre: true,
        username: true,
        email: true,
        rol: true,
        sedeId: true,
        activo: true,
      },
    });
  }
}
