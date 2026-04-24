import { Injectable } from '@nestjs/common';
import { EstadoHabitacion } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PublicService {
  constructor(private prisma: PrismaService) {}

  /**
   * Datos completos para la landing pública (sin autenticación).
   * Retorna sedes activas + habitaciones con sus fotos.
   */
  async landing() {
    const [sedes, habitaciones] = await Promise.all([
      this.prisma.sede.findMany({
        where: { activa: true },
        orderBy: [{ esPrincipal: 'desc' }, { id: 'asc' }],
        select: {
          id: true,
          nombre: true,
          direccion: true,
          telefono: true,
          esPrincipal: true,
          _count: {
            select: { habitaciones: { where: { activa: true } } },
          },
          habitaciones: {
            where: { activa: true },
            orderBy: { precioNoche: 'asc' },
            take: 1,
            select: { precioNoche: true },
          },
        },
      }),
      this.prisma.habitacion.findMany({
        where: { activa: true },
        orderBy: [{ sedeId: 'asc' }, { pisoId: 'asc' }, { numero: 'asc' }],
        select: {
          id: true,
          numero: true,
          descripcion: true,
          caracteristicas: true,
          precioHora: true,
          precioNoche: true,
          estado: true,
          sedeId: true,
          sede: { select: { id: true, nombre: true } },
          piso: { select: { numero: true, nombre: true } },
          fotos: {
            orderBy: [{ orden: 'asc' }, { id: 'asc' }],
            select: { id: true, path: true, orden: true },
          },
        },
      }),
    ]);

    // Aplana la estructura para que el frontend la consuma fácil
    const SEDE_COVER_FALLBACK =
      'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=2000&q=80';
    const sedesFmt = sedes.map((s) => {
      const short = s.nombre.split(' ').slice(-1)[0];
      return {
        id: s.id,
        name: s.nombre,
        nombre: s.nombre,
        short,
        city: short,
        region: 'Perú',
        tagline: 'Tu hogar fuera de casa',
        desc:
          s.direccion || `Hotel Sol Caribe sede ${short}. Hospedaje cómodo.`,
        since: '',
        address: s.direccion || '',
        img: SEDE_COVER_FALLBACK,
        cover: SEDE_COVER_FALLBACK,
        direccion: s.direccion,
        telefono: s.telefono,
        esPrincipal: s.esPrincipal,
        roomCount: s._count.habitaciones,
        habitacionesCount: s._count.habitaciones,
        priceFrom: s.habitaciones[0]
          ? Number(s.habitaciones[0].precioNoche)
          : 0,
        rating: 4.8,
        reviews: 120,
        features: ['WiFi', 'Recepción 24h', 'Limpieza diaria', 'Seguridad'],
      };
    });

    // Placeholder servido por la landing (/var/www/landing/assets/...)
    const PLACEHOLDER = '/assets/room-placeholder.jpg';

    const AMENITIES_DEFAULT = [
      'Wi-Fi gratis',
      'TV cable',
      'Baño privado',
      'Agua caliente',
      'Toallas',
    ];
    const roomsFmt = habitaciones.map((h) => {
      const paths = h.fotos.map((f) => f.path);
      // Si no hay fotos, usar placeholder para no romper la landing
      const gallery = paths.length > 0 ? paths : [PLACEHOLDER];
      const caracteristicasArr = h.caracteristicas
        ? h.caracteristicas
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
        : [];
      const tier = h.descripcion || 'Estándar';
      return {
        id: h.id,
        sede: h.sedeId, // id de la sede (para filtros legacy)
        sedeId: h.sedeId,
        sedeNombre: h.sede.nombre,
        num: h.numero,
        name: h.descripcion || `Habitación ${h.numero}`,
        descripcion: h.descripcion,
        caracteristicas: h.caracteristicas,
        tier,
        size: 18,
        capacity: 2,
        beds: '1 cama',
        view: `Piso ${h.piso.numero}`,
        precioHora: Number(h.precioHora),
        precioNoche: Number(h.precioNoche),
        price: Number(h.precioNoche),
        currency: 'PEN',
        estado: h.estado,
        disponible: h.estado === EstadoHabitacion.DISPONIBLE,
        piso: h.piso.numero,
        fotos: gallery,
        img: gallery[0],
        gallery,
        hasRealPhotos: paths.length > 0,
        desc: h.caracteristicas || `Habitación ${h.numero} · ${tier}`,
        features:
          caracteristicasArr.length > 0
            ? caracteristicasArr
            : AMENITIES_DEFAULT.slice(0, 4),
        amenities:
          caracteristicasArr.length > 0
            ? [...caracteristicasArr, ...AMENITIES_DEFAULT].filter(
                (v, i, arr) => arr.indexOf(v) === i,
              )
            : AMENITIES_DEFAULT,
      };
    });

    return {
      sedes: sedesFmt,
      rooms: roomsFmt,
    };
  }
}
