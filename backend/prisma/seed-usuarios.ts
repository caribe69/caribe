/**
 * Crea el personal + su usuario del sistema a partir de la lista entregada.
 * Idempotente: si el DNI (personal) o el username (usuario) ya existen, los
 * salta. Los "REMPLAZANTES" se crean MULTISEDE (acceso a todas las sedes hotel).
 *
 * Uso (una vez, en el VPS):  cd backend && npx ts-node prisma/seed-usuarios.ts
 */
import { PrismaClient, Rol } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

type P = {
  dni: string;
  nombre: string;
  apellidoP: string;
  apellidoM: string;
  telefono: string | null;
  sede: string; // nombre de sede o 'MULTISEDE'
  rol: Rol;
  cargo: string;
  username: string;
  password: string;
};

const PERSONAL: P[] = [
  { dni: '46727257', nombre: 'Kely', apellidoP: 'Valle', apellidoM: 'Hurtado', telefono: '967162519', sede: 'Hotel Caribe I', rol: 'HOTELERO', cargo: 'Recepcionista', username: 'kelyvalle', password: 'kbni737' },
  { dni: '75319742', nombre: 'Liz', apellidoP: 'Soto', apellidoM: 'Soto', telefono: '928505307', sede: 'Hotel Caribe I', rol: 'HOTELERO', cargo: 'Recepcionista', username: 'lizsoto', password: 'bfqe293' },
  { dni: '70163846', nombre: 'Josselyn', apellidoP: 'Ortega', apellidoM: 'Simeon', telefono: '929479821', sede: 'Hotel Caribe II', rol: 'HOTELERO', cargo: 'Recepcionista', username: 'josselynortega', password: 'wndw989' },
  { dni: '70197044', nombre: 'Digna', apellidoP: 'Retiz', apellidoM: 'Victorio', telefono: '969560835', sede: 'Hotel Caribe III', rol: 'HOTELERO', cargo: 'Recepcionista', username: 'dignaretiz', password: 'whhf425' },
  { dni: '74390076', nombre: 'Shirley', apellidoP: 'Rivera', apellidoM: 'Galindo', telefono: '953298378', sede: 'Hotel Caribe III', rol: 'HOTELERO', cargo: 'Recepcionista', username: 'shirleyrivera', password: 'trgn757' },
  { dni: '70286994', nombre: 'Galy', apellidoP: 'Vargas', apellidoM: 'Vargas', telefono: '937739244', sede: 'Hotel Sol Caribe', rol: 'HOTELERO', cargo: 'Recepcionista', username: 'galyvargas', password: 'pssu335' },
  { dni: '40944928', nombre: 'Ricardo', apellidoP: 'Estrada', apellidoM: 'Saavedra', telefono: '910713518', sede: 'Hotel Sol Caribe', rol: 'HOTELERO', cargo: 'Recepcionista', username: 'ricardoestrada', password: 'ejtc353' },
  { dni: '75765768', nombre: 'Nelver', apellidoP: 'Villalobos', apellidoM: 'Alarcon', telefono: null, sede: 'Hotel Sol Caribe', rol: 'LIMPIEZA', cargo: 'Limpieza', username: 'nelvervillalobos', password: 'xwpg594' },
  { dni: '45042915', nombre: 'Carlos', apellidoP: 'Aragones', apellidoM: 'Rojas', telefono: null, sede: 'Hotel Sol Caribe', rol: 'LIMPIEZA', cargo: 'Limpieza', username: 'carlosaragones', password: 'njaj287' },
  { dni: '73586774', nombre: 'Greysi', apellidoP: 'Torres', apellidoM: 'Neira', telefono: null, sede: 'Hotel Sol Caribe', rol: 'LAVANDERIA', cargo: 'Lavandería', username: 'greysitorres', password: 'savg663' },
  { dni: '40834239', nombre: 'Vilma', apellidoP: 'Cano', apellidoM: 'Yaranga', telefono: '961725005', sede: 'Hotel Caribe V', rol: 'HOTELERO', cargo: 'Recepcionista', username: 'vilmacano', password: 'rfya557' },
  { dni: '80403841', nombre: 'Miriam', apellidoP: 'Torres', apellidoM: 'Lobaton', telefono: '966306463', sede: 'MULTISEDE', rol: 'HOTELERO', cargo: 'Recepcionista (reemplazo)', username: 'miriamtorres', password: 'akmg243' },
  { dni: '10415459', nombre: 'Soledad', apellidoP: 'Torres', apellidoM: 'Lobaton', telefono: '904098674', sede: 'MULTISEDE', rol: 'HOTELERO', cargo: 'Recepcionista (reemplazo)', username: 'soledadtorres', password: 'sgwh623' },
];

const NOMBRES_HOTEL = [
  'Hotel Caribe I', 'Hotel Caribe II', 'Hotel Caribe III', 'Hotel Sol Caribe', 'Hotel Caribe V',
];

async function main() {
  const sedes = await prisma.sede.findMany({ select: { id: true, nombre: true, activa: true } });
  const byNombre = new Map(sedes.map((s) => [s.nombre.trim().toLowerCase(), s.id]));
  const idsHotel = NOMBRES_HOTEL.map((n) => byNombre.get(n.toLowerCase())).filter((x): x is number => !!x);
  if (idsHotel.length === 0) throw new Error('No encontré las sedes hotel por nombre. Revisa los nombres.');
  const sedeBaseMultisede = idsHotel[0];

  let creados = 0;
  let saltados = 0;

  for (const p of PERSONAL) {
    const yaUser = await prisma.usuario.findUnique({ where: { username: p.username } });
    if (yaUser) {
      console.log(`↷  ${p.username} — usuario ya existe, saltado`);
      saltados++;
      continue;
    }
    const personalExist = await prisma.personal.findUnique({ where: { dni: p.dni } });
    if (personalExist?.usuarioId) {
      console.log(`↷  DNI ${p.dni} — el personal ya tiene usuario, saltado`);
      saltados++;
      continue;
    }

    const esMultisede = p.sede === 'MULTISEDE';
    const sedeMapeada = esMultisede ? sedeBaseMultisede : byNombre.get(p.sede.toLowerCase());
    const sedeId = personalExist?.sedeId ?? sedeMapeada;
    if (!sedeId) {
      console.log(`⚠  No encontré la sede "${p.sede}" para ${p.username} — saltado`);
      saltados++;
      continue;
    }

    const passwordHash = await bcrypt.hash(p.password, 10);
    const nombreCompleto = [p.nombre, p.apellidoP, p.apellidoM].filter(Boolean).join(' ');

    await prisma.$transaction(async (tx) => {
      const usuario = await tx.usuario.create({
        data: {
          username: p.username,
          nombre: nombreCompleto,
          email: null,
          rol: p.rol,
          sedeId,
          passwordHash,
          activo: true,
        },
      });
      if (personalExist) {
        // Personal ya existía (creado antes): completar datos y vincular usuario.
        await tx.personal.update({
          where: { id: personalExist.id },
          data: {
            nombre: p.nombre,
            apellidoPaterno: p.apellidoP,
            apellidoMaterno: p.apellidoM,
            telefono: personalExist.telefono ?? p.telefono,
            cargo: personalExist.cargo ?? p.cargo,
            sedeId,
            activo: true,
            usuarioId: usuario.id,
          },
        });
      } else {
        await tx.personal.create({
          data: {
            dni: p.dni,
            nombre: p.nombre,
            apellidoPaterno: p.apellidoP,
            apellidoMaterno: p.apellidoM,
            telefono: p.telefono,
            cargo: p.cargo,
            sedeId,
            activo: true,
            usuarioId: usuario.id,
          },
        });
      }
      if (esMultisede) {
        await tx.usuarioSede.createMany({
          data: idsHotel.map((sid) => ({ usuarioId: usuario.id, sedeId: sid })),
          skipDuplicates: true,
        });
      }
    });
    console.log(`✔  ${p.username.padEnd(18)} · ${p.rol.padEnd(10)} · ${esMultisede ? 'MULTISEDE' : p.sede}${personalExist ? ' (vinculado a personal existente)' : ''}`);
    creados++;
  }

  console.log(`\n✔ Terminado. Creados: ${creados} · Saltados: ${saltados}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
