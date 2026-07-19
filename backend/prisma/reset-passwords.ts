/**
 * Actualiza las contraseñas del staff a un formato fácil de recordar:
 * apellido paterno (minúsculas) + últimos 2 dígitos del DNI.
 * Solo cambia la contraseña de los usuarios listados; no toca nada más.
 *
 * Uso (en el VPS):  cd backend && npx ts-node prisma/reset-passwords.ts
 */
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const NUEVAS: Record<string, string> = {
  kelyvalle: 'valle57',
  lizsoto: 'soto42',
  josselynortega: 'ortega46',
  dignaretiz: 'retiz44',
  shirleyrivera: 'rivera76',
  galyvargas: 'vargas94',
  ricardoestrada: 'estrada28',
  nelvervillalobos: 'villalobos68',
  carlosaragones: 'aragones15',
  greysitorres: 'torres74',
  vilmacano: 'cano39',
  miriamtorres: 'torres41',
  soledadtorres: 'torres59',
};

async function main() {
  let ok = 0;
  let noEncontrado = 0;
  for (const [username, pass] of Object.entries(NUEVAS)) {
    const u = await prisma.usuario.findUnique({ where: { username } });
    if (!u) {
      console.log(`⚠  ${username} — no existe, saltado`);
      noEncontrado++;
      continue;
    }
    const passwordHash = await bcrypt.hash(pass, 10);
    await prisma.usuario.update({
      where: { username },
      data: { passwordHash },
    });
    console.log(`✔  ${username.padEnd(18)} → ${pass}`);
    ok++;
  }
  console.log(`\n✔ Contraseñas actualizadas: ${ok} · No encontrados: ${noEncontrado}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
