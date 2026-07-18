import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PublicService {
  constructor(private prisma: PrismaService) {}

  /**
   * Datos completos para la landing pública (sin autenticación).
   * Retorna sedes activas + habitaciones con sus fotos.
   */
  async landing() {
    const [sedes, maquetas, slidesRaw, cfg] = await Promise.all([
      // Solo sedes marcadas como visibles en la web (y activas).
      this.prisma.sede.findMany({
        where: { activa: true, webVisible: true },
        orderBy: [{ esPrincipal: 'desc' }, { id: 'asc' }],
        select: {
          id: true,
          nombre: true,
          direccion: true,
          telefono: true,
          estrellas: true,
          esPrincipal: true,
          webPortada: true,
          _count: {
            select: { landingHabitaciones: { where: { activo: true } } },
          },
        },
      }),
      // Habitaciones-maqueta (no las reales del sistema).
      this.prisma.landingHabitacion.findMany({
        where: {
          activo: true,
          sede: { activa: true, webVisible: true },
        },
        orderBy: [{ sedeId: 'asc' }, { orden: 'asc' }, { id: 'asc' }],
        include: {
          sede: { select: { id: true, nombre: true } },
          fotos: {
            orderBy: [{ orden: 'asc' }, { id: 'asc' }],
            select: { path: true },
          },
        },
      }),
      this.prisma.landingSlide.findMany({
        where: { activo: true },
        orderBy: [{ orden: 'asc' }, { id: 'asc' }],
      }),
      this.prisma.appConfig.findUnique({ where: { id: 1 } }),
    ]);

    const slides = slidesRaw.map((s) => ({
      id: s.id,
      titulo: s.titulo,
      subtitulo: s.subtitulo,
      descripcion: s.descripcion,
      imagen: s.imagen,
      precio: s.precio,
      beneficios: (s.beneficios || '')
        .split(',')
        .map((b) => b.trim())
        .filter(Boolean),
      botonTexto: s.botonTexto,
      botonUrl: s.botonUrl,
    }));

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
        img: s.webPortada || SEDE_COVER_FALLBACK,
        cover: s.webPortada || SEDE_COVER_FALLBACK,
        portada: s.webPortada || null,
        direccion: s.direccion,
        telefono: s.telefono,
        estrellas: s.estrellas,
        esPrincipal: s.esPrincipal,
        roomCount: s._count.landingHabitaciones,
        habitacionesCount: s._count.landingHabitaciones,
        priceFrom: 0,
        rating: 4.8,
        reviews: 120,
        features: ['WiFi', 'Recepción 24h', 'Limpieza diaria', 'Seguridad'],
      };
    });

    // Habitaciones-maqueta: los precios son texto libre ("S/ 120"), las fotos
    // son las que subió el admin (pueden ser varias). Sin fotos => hasRealPhotos
    // false para que la landing use su placeholder.
    const roomsFmt = maquetas.map((h) => {
      const fotos = h.fotos.map((f) => f.path);
      const caracteristicasArr = (h.caracteristicas || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      return {
        id: h.id,
        sede: h.sedeId,
        sedeId: h.sedeId,
        sedeNombre: h.sede.nombre,
        name: h.nombre,
        descripcion: h.descripcion,
        desc: h.descripcion || '',
        caracteristicas: h.caracteristicas,
        // Precios como texto tal cual los escribió el admin (o vacío)
        precioNoche: h.precioNoche || '',
        precioHora: h.precioHora || '',
        capacidad: h.capacidad ?? null,
        camas: h.camas || '',
        fotos,
        img: fotos[0] || null,
        gallery: fotos,
        hasRealPhotos: fotos.length > 0,
        features: caracteristicasArr,
        amenities: caracteristicasArr,
      };
    });

    const contacto = {
      whatsapp: cfg?.landingWhatsapp || '',
      email: cfg?.landingEmail || cfg?.empresaEmail || '',
      direccion: cfg?.landingDireccion || cfg?.empresaDireccion || '',
      telefono: cfg?.empresaTelefono || '',
      mapsUrl: cfg?.landingMapsUrl || '',
    };

    return {
      sedes: sedesFmt,
      rooms: roomsFmt,
      slides,
      contacto,
    };
  }
}
