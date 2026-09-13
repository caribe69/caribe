import { ForbiddenException } from '@nestjs/common';
import { Rol } from '@prisma/client';
import { JwtPayload } from '../auth/auth.service';
import { PrismaService } from '../prisma/prisma.service';

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
    // SUPERADMIN: prioridad al query param; si no, usa la sede por defecto del token
    if (sedeIdFromQuery) return sedeIdFromQuery;
    if (user.sedeId) return user.sedeId;
    throw new ForbiddenException('SUPERADMIN debe indicar sedeId');
  }
  if (!user.sedeId) throw new ForbiddenException('Sin sede asignada');
  return user.sedeId;
}

export function enforceSede(user: JwtPayload, sedeIdRegistro: number) {
  if (user.rol === Rol.SUPERADMIN) return;
  if (user.sedeId !== sedeIdRegistro)
    throw new ForbiddenException('Registro fuera de tu sede');
}

/**
 * Alcance de sede para módulos de RECEPCIÓN + CAJA cuando la sede es parte de
 * un complejo de varias torres (sede agrupadora con edificios).
 *
 * - `base`  : la sede operativa del usuario (su torre, o una sede normal).
 * - `root`  : la raíz del complejo (la sede padre si `base` es una torre; si no,
 *             la misma `base`). El turno de caja vive bajo `root`, así es UNO
 *             solo para todas las torres del complejo.
 * - `scopeIds`: todas las sedes que abarca el complejo (raíz + torres). Para una
 *             sede normal (sin torres) es simplemente `[base]`.
 * - `esComplejo`: true si la sede pertenece a un complejo de ≥2 torres.
 *
 * Stock, productos y limpieza NO usan este alcance: siguen por torre (`base`).
 */
export interface SedeScope {
  base: number;
  root: number;
  scopeIds: number[];
  esComplejo: boolean;
}

/**
 * Como `enforceSede`, pero permite además registros de sedes hermanas del mismo
 * complejo (doble torre). Úsalo en rutas de recepción/caja donde el usuario de
 * una torre opera registros de otra torre del mismo complejo.
 */
export async function enforceSedeScope(
  prisma: PrismaService,
  user: JwtPayload,
  sedeIdRegistro: number,
): Promise<void> {
  if (user.rol === Rol.SUPERADMIN) return;
  if (user.sedeId === sedeIdRegistro) return;
  const { scopeIds } = await resolveSedeScope(prisma, user);
  if (scopeIds.includes(sedeIdRegistro)) return;
  throw new ForbiddenException('Registro fuera de tu sede');
}

export async function resolveSedeScope(
  prisma: PrismaService,
  user: JwtPayload,
  sedeIdFromQuery?: number,
): Promise<SedeScope> {
  const base = resolveSedeId(user, sedeIdFromQuery);
  const sede = await prisma.sede.findUnique({
    where: { id: base },
    select: { id: true, sedePadreId: true },
  });
  const root = sede?.sedePadreId ?? base;
  const edificios = await prisma.sede.findMany({
    where: { sedePadreId: root },
    select: { id: true },
    orderBy: { id: 'asc' },
  });
  if (edificios.length > 0) {
    return {
      base,
      root,
      // raíz (sin habitaciones propias) + todas las torres
      scopeIds: [root, ...edificios.map((e) => e.id)],
      esComplejo: true,
    };
  }
  return { base, root, scopeIds: [base], esComplejo: false };
}
