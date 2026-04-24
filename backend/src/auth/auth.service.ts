import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';

export interface JwtPayload {
  sub: number;
  username: string;
  rol: string;
  sedeId: number | null;
}

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.prisma.usuario.findUnique({
      where: { username: dto.username },
      include: { sede: true },
    });
    if (!user || !user.activo) throw new UnauthorizedException('Credenciales inválidas');

    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Credenciales inválidas');

    // SUPERADMIN sin sede asignada: usar la primera sede activa como sede por defecto
    let sedeEfectiva = user.sede;
    let sedeIdEfectivo = user.sedeId;
    if (user.rol === 'SUPERADMIN' && !sedeIdEfectivo) {
      const primera = await this.prisma.sede.findFirst({
        where: { activa: true },
        orderBy: { id: 'asc' },
      });
      if (primera) {
        sedeIdEfectivo = primera.id;
        sedeEfectiva = primera;
      }
    }

    const payload: JwtPayload = {
      sub: user.id,
      username: user.username,
      rol: user.rol,
      sedeId: sedeIdEfectivo,
    };

    // Duración de la sesión: leer de AppConfig.sessionTtlDays (default 30).
    // Si no existe la fila aún, usamos 30 días. Clamp [1, 365].
    let ttlDays = 30;
    try {
      const cfg = await this.prisma.appConfig.findUnique({ where: { id: 1 } });
      if (cfg && Number.isFinite(cfg.sessionTtlDays)) {
        ttlDays = Math.min(365, Math.max(1, cfg.sessionTtlDays));
      }
    } catch {
      // Si falla la lectura, usamos el default; no bloquear el login
    }

    return {
      access_token: this.jwt.sign(payload, { expiresIn: `${ttlDays}d` }),
      usuario: {
        id: user.id,
        nombre: user.nombre,
        username: user.username,
        email: user.email,
        rol: user.rol,
        sedeId: sedeIdEfectivo,
        sede: sedeEfectiva
          ? { id: sedeEfectiva.id, nombre: sedeEfectiva.nombre }
          : null,
      },
    };
  }

  async hashPassword(password: string) {
    if (!password || password.length < 6)
      throw new BadRequestException('La contraseña debe tener al menos 6 caracteres');
    return bcrypt.hash(password, 10);
  }

  async changePassword(
    userId: number,
    currentPassword: string,
    newPassword: string,
  ) {
    if (currentPassword === newPassword) {
      throw new BadRequestException(
        'La contraseña nueva debe ser diferente a la actual',
      );
    }
    const user = await this.prisma.usuario.findUnique({
      where: { id: userId },
    });
    if (!user) throw new UnauthorizedException('Usuario no encontrado');

    const ok = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!ok)
      throw new BadRequestException('La contraseña actual es incorrecta');

    const newHash = await this.hashPassword(newPassword);
    await this.prisma.usuario.update({
      where: { id: userId },
      data: { passwordHash: newHash },
    });
    return { ok: true };
  }
}
