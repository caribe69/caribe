import { ForbiddenException } from '@nestjs/common';
import { Rol } from '@prisma/client';
import { JwtPayload } from '../auth/auth.service';

export function requireSede(user: JwtPayload): number {
  if (user.rol === Rol.SUPERADMIN) {
    throw new ForbiddenException(
      'SUPERADMIN debe especificar sedeId en la query',
    );
  }
  if (!user.sedeId) throw new ForbiddenException('Sin sede asignada');
  return user.sedeId;
}

export function resolveSedeId(
  user: JwtPayload,
  sedeIdFromQuery?: number,
): number {
  if (user.rol === Rol.SUPERADMIN) {
    if (!sedeIdFromQuery)
      throw new ForbiddenException('SUPERADMIN debe indicar sedeId');
    return sedeIdFromQuery;
  }
  if (!user.sedeId) throw new ForbiddenException('Sin sede asignada');
  return user.sedeId;
}

export function enforceSede(user: JwtPayload, sedeIdRegistro: number) {
  if (user.rol === Rol.SUPERADMIN) return;
  if (user.sedeId !== sedeIdRegistro)
    throw new ForbiddenException('Registro fuera de tu sede');
}
