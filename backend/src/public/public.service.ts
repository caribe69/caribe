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
    const sedesFmt = sedes.map((s) => ({
      id: s.id,
      nombre: s.nombre,
      short: s.nombre.split(' ').slice(-1)[0], // "Hotel Caribe Norte" → "Norte"
      city: s.nombre,
      direccion: s.direccion,
      telefono: s.telefono,
      esPrincipal: s.esPrincipal,
      habitacionesCount: s._count.habitaciones,
      priceFrom: s.habitaciones[0]
        ? Number(s.habitaciones[0].precioNoche)
        : 0,
    }));

    const roomsFmt = habitaciones.map((h) => ({
      id: h.id,
      num: h.numero,
      name: h.descripcion || `Habitación ${h.numero}`,
      descripcion: h.descripcion,
      caracteristicas: h.caracteristicas,
      tier: (h.descripcion || '').toUpperCase() || 'ESTÁNDAR',
      precioHora: Number(h.precioHora),
      precioNoche: Number(h.precioNoche),
      price: Number(h.precioNoche),
      currency: 'PEN',
      estado: h.estado,
      disponible: h.estado === EstadoHabitacion.DISPONIBLE,
      sedeId: h.sedeId,
      sede: h.sede.nombre,
      sedeShort: h.sede.nombre.split(' ').slice(-1)[0],
      piso: h.piso.numero,
      fotos: h.fotos.map((f) => f.path),
      img: h.fotos[0]?.path || null,
      gallery: h.fotos.map((f) => f.path),
      // Defaults razonables para campos que la landing usa pero no tenemos en DB aún
      size: 0,
      capacity: 2,
      beds: h.descripcion || '',
      view: '',
      amenities: h.caracteristicas
        ? h.caracteristicas.split(',').map((s) => s.trim()).filter(Boolean)
        : [],
      features: h.caracteristicas
        ? h.caracteristicas.split(',').map((s) => s.trim()).filter(Boolean)
        : [],
    }));

    return {
      sedes: sedesFmt,
      rooms: roomsFmt,
    };
  }
}
