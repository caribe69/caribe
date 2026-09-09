import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { AuditService } from '../audit/audit.service';

export interface JwtPayload {
  sub: number;
  username: string;
  rol: string;
  sedeId: number | null;
}

export interface LoginContext {
  ip?: string;
  userAgent?: string;
}

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private audit: AuditService,
  ) {}

  /**
   * Opciones de login para un username: si la cuenta es multisede (tiene
   * acceso a ≥2 sedes), devuelve la lista de sedes para que el usuario elija
   * ANTES de escribir la contraseña. Para cuentas normales o inexistentes
   * devuelve multisede:false (no revela si el usuario existe).
   */
  async loginOptions(username: string) {
    const vacio = { multisede: false, sedes: [] as any[] };
    const user = await this.prisma.usuario.findUnique({
      where: { username },
      include: {
        sedesAcceso: { include: { sede: { include: { sedePadre: true } } } },
      },
    });
    if (!user || !user.activo || user.rol === 'SUPERADMIN') return vacio;
    if (user.sedesAcceso.length >= 2) {
      return {
        multisede: true,
        sedes: user.sedesAcceso.map((a) => ({
          id: a.sede.id,
          nombre: a.sede.nombre,
          grupo: a.sede.sedePadre?.nombre ?? null,
        })),
      };
    }
    return vacio;
  }

  async login(dto: LoginDto, ctx: LoginContext = {}) {
    const user = await this.prisma.usuario.findUnique({
      where: { username: dto.username },
      include: {
        sede: { include: { sedePadre: true } },
        sedesAcceso: { include: { sede: { include: { sedePadre: true } } } },
      },
    });
    if (!user || !user.activo) {
      // Registrar intento fallido (si es que el usuario existe o no)
      this.audit.record({
        usuarioId: null,
        username: dto.username,
        accion: 'LOGIN_FAIL',
        metodo: 'POST',
        path: '/api/auth/login',
        ip: ctx.ip ?? null,
        userAgent: ctx.userAgent ?? null,
        detalle: { motivo: !user ? 'usuario_no_existe' : 'inactivo' },
        ok: false,
        statusCode: 401,
      });
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) {
      this.audit.record({
        usuarioId: user.id,
        username: user.username,
        rol: user.rol,
        sedeId: user.sedeId,
        accion: 'LOGIN_FAIL',
        metodo: 'POST',
        path: '/api/auth/login',
        ip: ctx.ip ?? null,
        userAgent: ctx.userAgent ?? null,
        detalle: { motivo: 'password_incorrecto' },
        ok: false,
        statusCode: 401,
      });
      throw new UnauthorizedException('Credenciales inválidas');
    }

    // ── Resolver la sede a la que entra según la elegida en el login ──
    // El login lista TODAS las sedes; aquí se valida que el usuario pueda
    // entrar a la que eligió. Si no le pertenece, simplemente no lo deja.
    let sedeEfectiva = user.sede;
    let sedeIdEfectivo = user.sedeId;

    if (user.rol === 'SUPERADMIN') {
      // SUPERADMIN puede entrar a cualquier sede operativa (activa, hoja).
      if (dto.sedeId) {
        const s = await this.prisma.sede.findFirst({
          where: { id: dto.sedeId, activa: true },
          include: { sedePadre: true },
        });
        if (!s) throw new UnauthorizedException('Sede no válida');
        sedeIdEfectivo = s.id;
        sedeEfectiva = s;
      } else if (!sedeIdEfectivo) {
        const primera = await this.prisma.sede.findFirst({
          // Solo una sede operativa (hoja), nunca un agrupador de edificios.
          where: { activa: true, edificios: { none: {} } },
          orderBy: { id: 'asc' },
          include: { sedePadre: true },
        });
        if (primera) {
          sedeIdEfectivo = primera.id;
          sedeEfectiva = primera;
        }
      }
    } else if (dto.sedeId) {
      // Sedes a las que el usuario tiene acceso: su sede principal + accesos.
      const permitidas = new Set<number>();
      if (user.sedeId) permitidas.add(user.sedeId);
      for (const a of user.sedesAcceso) permitidas.add(a.sedeId);

      if (!permitidas.has(dto.sedeId)) {
        // Credenciales correctas, pero la sede elegida no es suya → no entra.
        this.audit.record({
          usuarioId: user.id,
          username: user.username,
          rol: user.rol,
          sedeId: user.sedeId,
          accion: 'LOGIN_FAIL',
          metodo: 'POST',
          path: '/api/auth/login',
          ip: ctx.ip ?? null,
          userAgent: ctx.userAgent ?? null,
          detalle: { motivo: 'sede_no_permitida', sedeIntento: dto.sedeId },
          ok: false,
          statusCode: 401,
        });
        throw new UnauthorizedException('No tienes acceso a esa sede');
      }

      sedeIdEfectivo = dto.sedeId;
      // Cargar la sede elegida (puede ser la principal o una de acceso).
      if (user.sede?.id === dto.sedeId) {
        sedeEfectiva = user.sede;
      } else {
        const acc = user.sedesAcceso.find((a) => a.sedeId === dto.sedeId);
        sedeEfectiva = acc
          ? acc.sede
          : await this.prisma.sede.findUnique({
              where: { id: dto.sedeId },
              include: { sedePadre: true },
            });
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

    // Registrar login exitoso
    this.audit.record({
      usuarioId: user.id,
      username: user.username,
      rol: user.rol,
      sedeId: sedeIdEfectivo,
      accion: 'LOGIN',
      metodo: 'POST',
      path: '/api/auth/login',
      ip: ctx.ip ?? null,
      userAgent: ctx.userAgent ?? null,
      detalle: { ttlDays },
      ok: true,
      statusCode: 201,
    });

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
          ? {
              id: sedeEfectiva.id,
              nombre: sedeEfectiva.nombre,
              grupo: (sedeEfectiva as any).sedePadre?.nombre ?? null,
            }
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
