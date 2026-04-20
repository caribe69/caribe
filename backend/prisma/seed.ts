import { PrismaClient, Rol, EstadoHabitacion } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

interface SedeData {
  nombre: string;
  direccion: string;
  telefono: string;
  slug: string; // prefijo para usuarios (admin_central, hotelero_central, etc)
}

const SEDES: SedeData[] = [
  {
    nombre: 'Hotel Caribe Central',
    direccion: 'Av. Arequipa 1234, Lima Centro',
    telefono: '01-555-0001',
    slug: 'central',
  },
  {
    nombre: 'Hotel Caribe Norte',
    direccion: 'Av. Túpac Amaru 456, San Martín de Porres',
    telefono: '01-555-0002',
    slug: 'norte',
  },
  {
    nombre: 'Hotel Caribe Sur',
    direccion: 'Av. Huaylas 789, Chorrillos',
    telefono: '01-555-0003',
    slug: 'sur',
  },
  {
    nombre: 'Hotel Caribe Este',
    direccion: 'Av. La Molina 1010, La Molina',
    telefono: '01-555-0004',
    slug: 'este',
  },
];

async function crearSede(s: SedeData, passwordHash: string) {
  console.log(`\n🏨 ${s.nombre}`);

  let sede = await prisma.sede.findFirst({ where: { nombre: s.nombre } });
  if (!sede) {
    sede = await prisma.sede.create({
      data: {
        nombre: s.nombre,
        direccion: s.direccion,
        telefono: s.telefono,
      },
    });
  }

  // --- Usuarios (personal) ---
  const roles: { username: string; nombre: string; rol: Rol }[] = [
    { username: `admin_${s.slug}`, nombre: `Admin ${s.nombre}`, rol: Rol.ADMIN_SEDE },
    { username: `hotelero_${s.slug}`, nombre: `Recepcionista ${s.slug}`, rol: Rol.HOTELERO },
    { username: `limpieza_${s.slug}`, nombre: `Personal Limpieza ${s.slug}`, rol: Rol.LIMPIEZA },
    { username: `cajero_${s.slug}`, nombre: `Cajero ${s.slug}`, rol: Rol.CAJERO },
  ];
  for (const u of roles) {
    await prisma.usuario.upsert({
      where: { username: u.username },
      update: { sedeId: sede.id, activo: true },
      create: {
        nombre: u.nombre,
        username: u.username,
        passwordHash,
        rol: u.rol,
        sedeId: sede.id,
      },
    });
  }
  console.log(`  ✔ 4 usuarios creados (${roles.map((r) => r.username).join(', ')})`);

  // --- Pisos ---
  const piso1 = await prisma.piso.upsert({
    where: { sedeId_numero: { sedeId: sede.id, numero: 1 } },
    update: {},
    create: { sedeId: sede.id, numero: 1, nombre: 'Primer Piso' },
  });
  const piso2 = await prisma.piso.upsert({
    where: { sedeId_numero: { sedeId: sede.id, numero: 2 } },
    update: {},
    create: { sedeId: sede.id, numero: 2, nombre: 'Segundo Piso' },
  });
  console.log(`  ✔ 2 pisos`);

  // --- Habitaciones ---
  const habitaciones = [
    { numero: '101', piso: piso1.id, hora: 25, noche: 120, desc: 'Simple económica' },
    { numero: '102', piso: piso1.id, hora: 25, noche: 120, desc: 'Simple económica' },
    { numero: '103', piso: piso1.id, hora: 30, noche: 150, desc: 'Doble estándar' },
    { numero: '104', piso: piso1.id, hora: 30, noche: 150, desc: 'Doble estándar' },
    { numero: '201', piso: piso2.id, hora: 35, noche: 180, desc: 'Matrimonial' },
    { numero: '202', piso: piso2.id, hora: 40, noche: 200, desc: 'Matrimonial deluxe' },
    { numero: '203', piso: piso2.id, hora: 50, noche: 250, desc: 'Suite ejecutiva' },
  ];
  for (const h of habitaciones) {
    await prisma.habitacion.upsert({
      where: { sedeId_numero: { sedeId: sede.id, numero: h.numero } },
      update: {},
      create: {
        sedeId: sede.id,
        pisoId: h.piso,
        numero: h.numero,
        descripcion: h.desc,
        caracteristicas: 'Cama, TV, WiFi, Baño privado, Aire acondicionado',
        precioHora: h.hora,
        precioNoche: h.noche,
        estado: EstadoHabitacion.DISPONIBLE,
      },
    });
  }
  console.log(`  ✔ ${habitaciones.length} habitaciones`);

  // --- Productos consumibles (almacén por sede) ---
  const productos = [
    { nombre: 'Coca Cola 500ml', precio: 5, stock: 50 },
    { nombre: 'Inca Kola 500ml', precio: 5, stock: 50 },
    { nombre: 'Agua Mineral 500ml', precio: 3, stock: 80 },
    { nombre: 'Cerveza Pilsen', precio: 8, stock: 40 },
    { nombre: 'Cerveza Cristal', precio: 8, stock: 40 },
    { nombre: 'Snack Papas Lays', precio: 4, stock: 60 },
    { nombre: 'Chocolate Sublime', precio: 3, stock: 70 },
    { nombre: 'Condones (paquete)', precio: 10, stock: 30 },
  ];
  for (const p of productos) {
    const exists = await prisma.producto.findFirst({
      where: { sedeId: sede.id, nombre: p.nombre },
    });
    if (!exists) {
      await prisma.producto.create({
        data: {
          sedeId: sede.id,
          nombre: p.nombre,
          precio: p.precio,
          stock: p.stock,
          stockMinimo: 10,
        },
      });
    }
  }
  console.log(`  ✔ ${productos.length} productos consumibles`);

  // --- Productos de limpieza (almacén por sede) ---
  const prodsLimpieza = [
    { nombre: 'Detergente líquido', stock: 20, unidad: 'litro' },
    { nombre: 'Desinfectante multiuso', stock: 15, unidad: 'litro' },
    { nombre: 'Lejía', stock: 10, unidad: 'litro' },
    { nombre: 'Papel higiénico', stock: 100, unidad: 'rollo' },
    { nombre: 'Toallas limpias', stock: 30, unidad: 'unidad' },
    { nombre: 'Sábanas limpias', stock: 40, unidad: 'juego' },
    { nombre: 'Ambientador', stock: 12, unidad: 'frasco' },
  ];
  for (const p of prodsLimpieza) {
    const exists = await prisma.productoLimpieza.findFirst({
      where: { sedeId: sede.id, nombre: p.nombre },
    });
    if (!exists) {
      await prisma.productoLimpieza.create({
        data: {
          sedeId: sede.id,
          nombre: p.nombre,
          stock: p.stock,
          stockMinimo: 5,
          unidad: p.unidad,
        },
      });
    }
  }
  console.log(`  ✔ ${prodsLimpieza.length} productos de limpieza`);
}

async function main() {
  console.log('🌱 Iniciando seed de 4 sedes...\n');

  const passwordHash = await bcrypt.hash('admin123', 10);

  // SUPERADMIN global
  await prisma.usuario.upsert({
    where: { username: 'superadmin' },
    update: {},
    create: {
      nombre: 'Super Administrador',
      username: 'superadmin',
      email: 'super@hotel.local',
      passwordHash,
      rol: Rol.SUPERADMIN,
    },
  });
  console.log('🔑 SUPERADMIN: superadmin / admin123');

  for (const s of SEDES) {
    await crearSede(s, passwordHash);
  }

  console.log('\n✅ Seed completado.\n');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  USUARIOS (contraseña: admin123)');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  superadmin            → SUPERADMIN (todas las sedes)');
  for (const s of SEDES) {
    console.log(`\n  ${s.nombre}:`);
    console.log(`    admin_${s.slug.padEnd(12)} → ADMIN_SEDE`);
    console.log(`    hotelero_${s.slug.padEnd(9)} → HOTELERO (recepción)`);
    console.log(`    limpieza_${s.slug.padEnd(9)} → LIMPIEZA`);
    console.log(`    cajero_${s.slug.padEnd(11)} → CAJERO`);
  }
  console.log('═══════════════════════════════════════════════════════════\n');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
