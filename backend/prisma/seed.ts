import { PrismaClient, Rol, EstadoHabitacion } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed...');

  const passwordHash = await bcrypt.hash('admin123', 10);

  const superadmin = await prisma.usuario.upsert({
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
  console.log('✔ SUPERADMIN creado: superadmin / admin123');

  const sede = await prisma.sede.upsert({
    where: { id: 1 },
    update: {},
    create: {
      nombre: 'Sede Principal',
      direccion: 'Av. Principal 123, Lima',
      telefono: '999-999-999',
    },
  });

  // Usuarios de prueba
  const usuarios = [
    { username: 'admin', rol: Rol.ADMIN_SEDE, nombre: 'Admin Sede' },
    { username: 'hotelero', rol: Rol.HOTELERO, nombre: 'Juan Hotelero' },
    { username: 'limpieza', rol: Rol.LIMPIEZA, nombre: 'María Limpieza' },
    { username: 'cajero', rol: Rol.CAJERO, nombre: 'Carlos Cajero' },
  ];
  for (const u of usuarios) {
    await prisma.usuario.upsert({
      where: { username: u.username },
      update: {},
      create: {
        nombre: u.nombre,
        username: u.username,
        passwordHash,
        rol: u.rol,
        sedeId: sede.id,
      },
    });
  }

  // Pisos
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

  // Habitaciones
  const habitaciones = [
    { numero: '101', piso: piso1.id, precioHora: 25, precioNoche: 120 },
    { numero: '102', piso: piso1.id, precioHora: 25, precioNoche: 120 },
    { numero: '103', piso: piso1.id, precioHora: 30, precioNoche: 150 },
    { numero: '201', piso: piso2.id, precioHora: 30, precioNoche: 150 },
    { numero: '202', piso: piso2.id, precioHora: 35, precioNoche: 180 },
  ];
  for (const h of habitaciones) {
    await prisma.habitacion.upsert({
      where: { sedeId_numero: { sedeId: sede.id, numero: h.numero } },
      update: {},
      create: {
        sedeId: sede.id,
        pisoId: h.piso,
        numero: h.numero,
        descripcion: 'Habitación estándar',
        caracteristicas: 'Cama doble, TV, WiFi, Baño privado',
        precioHora: h.precioHora,
        precioNoche: h.precioNoche,
        estado: EstadoHabitacion.DISPONIBLE,
      },
    });
  }

  // Productos (consumibles)
  const productos = [
    { nombre: 'Coca Cola 500ml', precio: 5, stock: 50 },
    { nombre: 'Agua Mineral 500ml', precio: 3, stock: 80 },
    { nombre: 'Cerveza Pilsen', precio: 8, stock: 40 },
    { nombre: 'Snack Papas', precio: 4, stock: 60 },
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

  // Productos de limpieza
  const prodsLimpieza = [
    { nombre: 'Detergente', stock: 20, unidad: 'litro' },
    { nombre: 'Desinfectante', stock: 15, unidad: 'litro' },
    { nombre: 'Papel Higiénico', stock: 100, unidad: 'rollo' },
    { nombre: 'Toallas limpias', stock: 30, unidad: 'unidad' },
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

  console.log('✅ Seed completado.');
  console.log('');
  console.log('Usuarios creados (contraseña: admin123):');
  console.log('  - superadmin (todas las sedes)');
  console.log('  - admin      (admin de sede principal)');
  console.log('  - hotelero   (encargado hotel/productos)');
  console.log('  - limpieza   (personal de limpieza)');
  console.log('  - cajero     (cajero)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
