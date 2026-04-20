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

    const payload: JwtPayload = {
      sub: user.id,
      username: user.username,
      rol: user.rol,
      sedeId: user.sedeId,
    };
    return {
      access_token: this.jwt.sign(payload),
      usuario: {
        id: user.id,
        nombre: user.nombre,
        username: user.username,
        email: user.email,
        rol: user.rol,
        sedeId: user.sedeId,
        sede: user.sede ? { id: user.sede.id, nombre: user.sede.nombre } : null,
      },
    };
  }

  async hashPassword(password: string) {
    if (!password || password.length < 6)
      throw new BadRequestException('La contraseña debe tener al menos 6 caracteres');
    return bcrypt.hash(password, 10);
  }
}
