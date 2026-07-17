/**
 * Importa los slides ACTUALES del sitio a la tabla LandingSlide, para poder
 * editarlos desde "Página web". Solo inserta si la tabla está vacía (idempotente).
 *
 * Uso (una sola vez, en el VPS):  cd backend && npx ts-node prisma/seed-landing.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Imagen de fondo que ya está publicada en la landing (URL absoluta para que
// también se vea en el panel del sistema, no solo en caribeperu.com)
const IMG =
  'https://caribeperu.com/assets/web/images/tMMbIdHVcwQ8pNOlp9hVSLZwTMfvlCgoXcokGa28.webp';

async function main() {
  const existen = await prisma.landingSlide.count();
  if (existen > 0) {
    console.log(`Ya hay ${existen} slides — no se importa nada.`);
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
        imagen: IMG,
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
