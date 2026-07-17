/**
 * Importa los slides ACTUALES del sitio a la tabla LandingSlide, para poder
 * editarlos desde "Página web". Solo inserta si la tabla está vacía (idempotente).
 *
 * Uso (una sola vez, en el VPS):  cd backend && npx ts-node prisma/seed-landing.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Imágenes de fondo que SÍ existen en la landing (verificadas 200 image/webp).
// URL absoluta para que también se vean en el panel del sistema.
const BASE = 'https://caribeperu.com/assets/web/images/';
const IMG = BASE + '9dca02cc8de40.webp';
const IMG2 = BASE + '6ZbJofPG4FRs67t4WR4c3ZRTxfikqwUYMaN21FBY.webp';

// Nombre de la imagen que se usó antes pero NO existe en el servidor (da 404).
const IMG_ROTA = 'tMMbIdHVcwQ8pNOlp9hVSLZwTMfvlCgoXcokGa28.webp';

async function main() {
  const existen = await prisma.landingSlide.count();
  if (existen > 0) {
    // Ya importados: corrige imágenes rotas para que se vean en panel y landing.
    const todos = await prisma.landingSlide.findMany({
      select: { id: true, imagen: true, orden: true },
    });
    let corregidas = 0;
    for (const s of todos) {
      let nueva: string | null = null;
      if (s.imagen && s.imagen.startsWith('/assets/')) {
        // Ruta relativa -> absoluta
        nueva = 'https://caribeperu.com' + s.imagen;
      }
      if (s.imagen && s.imagen.includes(IMG_ROTA)) {
        // Imagen inexistente -> una que sí existe (alterna por orden)
        nueva = s.orden % 2 === 0 ? IMG : IMG2;
      }
      if (nueva && nueva !== s.imagen) {
        await prisma.landingSlide.update({
          where: { id: s.id },
          data: { imagen: nueva },
        });
        corregidas++;
      }
    }
    console.log(
      `Ya hay ${existen} slides — ${corregidas} imagen(es) corregidas.`,
    );
    return;
  }

  await prisma.landingSlide.createMany({
    data: [
      {
        subtitulo: 'TU MEJOR OPCIÓN',
        titulo: 'Confort y tranquilidad muy cerca de ti',
        descripcion:
          'No busques más, la mejor estadía en Lima Este está aquí. Espacios modernos y atención cálida para que te sientas como en casa.',
        precio: 'Desde S/ 120',
        beneficios: 'Todo Incluido,Traslado Gratis,Acceso a Piscina,Wifi',
        botonTexto: 'Consultar tarifas',
        botonUrl: '#habitaciones',
        imagen: IMG,
        orden: 0,
        activo: true,
      },
      {
        subtitulo: 'ESTADÍA 100% SEGURA',
        titulo: 'Alojamiento de calidad al mejor precio',
        descripcion:
          '¿Buscas comodidad sin pagar de más? Descubre nuestras habitaciones con todo lo que necesitas para una estadía impecable. ¡Reserva en segundos!',
        botonTexto: 'Ver Ofertas',
        botonUrl: '#habitaciones',
        imagen: IMG2,
        orden: 1,
        activo: true,
      },
    ],
  });

  console.log('✔ 2 slides importados. Edítalos en Página web.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
