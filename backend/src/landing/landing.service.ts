import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface SlideInput {
  titulo?: string | null;
  subtitulo?: string | null;
  descripcion?: string | null;
  precio?: string | null;
  beneficios?: string | null;
  botonTexto?: string | null;
  botonUrl?: string | null;
  orden?: number;
  activo?: boolean;
}

export interface HabitacionInput {
  sedeId?: number;
  nombre?: string;
  descripcion?: string | null;
  caracteristicas?: string | null;
  precioNoche?: string | null;
  precioHora?: string | null;
  capacidad?: number | null;
  camas?: string | null;
  activo?: boolean;
}

@Injectable()
export class LandingService {
  constructor(private prisma: PrismaService) {}

  /** Todos los slides (admin), ordenados. */
  listar() {
    return this.prisma.landingSlide.findMany({
      orderBy: [{ orden: 'asc' }, { id: 'asc' }],
    });
  }

  /** Slides activos para la landing pública. */
  publicos() {
    return this.prisma.landingSlide.findMany({
      where: { activo: true },
      orderBy: [{ orden: 'asc' }, { id: 'asc' }],
    });
  }

  async crear(dto: SlideInput) {
    const max = await this.prisma.landingSlide.aggregate({
      _max: { orden: true },
    });
    return this.prisma.landingSlide.create({
      data: {
        titulo: dto.titulo ?? null,
        subtitulo: dto.subtitulo ?? null,
        descripcion: dto.descripcion ?? null,
        precio: dto.precio ?? null,
        beneficios: dto.beneficios ?? null,
        botonTexto: dto.botonTexto ?? null,
        botonUrl: dto.botonUrl ?? null,
        orden: dto.orden ?? (max._max.orden ?? 0) + 1,
        activo: dto.activo ?? true,
      },
    });
  }

  async actualizar(id: number, dto: SlideInput) {
    await this.findOne(id);
    return this.prisma.landingSlide.update({ where: { id }, data: dto as any });
  }

  async setImagen(id: number, path: string) {
    await this.findOne(id);
    return this.prisma.landingSlide.update({
      where: { id },
      data: { imagen: path },
    });
  }

  async findOne(id: number) {
    const s = await this.prisma.landingSlide.findUnique({ where: { id } });
    if (!s) throw new NotFoundException('Slide no encontrado');
    return s;
  }

  async eliminar(id: number) {
    await this.findOne(id);
    await this.prisma.landingSlide.delete({ where: { id } });
    return { ok: true };
  }

  /** Reordena: recibe la lista de ids en el nuevo orden. */
  async reordenar(ids: number[]) {
    if (!Array.isArray(ids) || ids.length === 0)
      throw new BadRequestException('Lista de ids vacía');
    await this.prisma.$transaction(
      ids.map((id, i) =>
        this.prisma.landingSlide.update({ where: { id }, data: { orden: i } }),
      ),
    );
    return this.listar();
  }

  // ══════════════════════════════════════════════════════════
  // SEDES EN LA WEB (mostrar/ocultar) + HABITACIONES-MAQUETA
  // ══════════════════════════════════════════════════════════

  /** Lista las sedes activas con su estado web y cantidad de maquetas. */
  async listarSedesWeb() {
    const sedes = await this.prisma.sede.findMany({
      where: { activa: true },
      orderBy: [{ esPrincipal: 'desc' }, { id: 'asc' }],
      select: {
        id: true,
        nombre: true,
        direccion: true,
        webVisible: true,
        esPrincipal: true,
        _count: { select: { landingHabitaciones: true } },
      },
    });
    return sedes.map((s) => ({
      id: s.id,
      nombre: s.nombre,
      direccion: s.direccion,
      webVisible: s.webVisible,
      esPrincipal: s.esPrincipal,
      maquetas: s._count.landingHabitaciones,
    }));
  }

  async toggleSedeWeb(sedeId: number, visible: boolean) {
    const s = await this.prisma.sede.findUnique({ where: { id: sedeId } });
    if (!s) throw new NotFoundException('Sede no encontrada');
    return this.prisma.sede.update({
      where: { id: sedeId },
      data: { webVisible: visible },
      select: { id: true, webVisible: true },
    });
  }

  /** Maquetas de una sede (admin), con sus fotos ordenadas. */
  listarHabitaciones(sedeId: number) {
    return this.prisma.landingHabitacion.findMany({
      where: { sedeId },
      orderBy: [{ orden: 'asc' }, { id: 'asc' }],
      include: { fotos: { orderBy: [{ orden: 'asc' }, { id: 'asc' }] } },
    });
  }

  async findHabitacion(id: number) {
    const h = await this.prisma.landingHabitacion.findUnique({
      where: { id },
      include: { fotos: { orderBy: [{ orden: 'asc' }, { id: 'asc' }] } },
    });
    if (!h) throw new NotFoundException('Habitación no encontrada');
    return h;
  }

  async crearHabitacion(dto: HabitacionInput) {
    if (!dto.sedeId) throw new BadRequestException('Falta la sede');
    if (!dto.nombre?.trim())
      throw new BadRequestException('La habitación necesita un nombre');
    const sede = await this.prisma.sede.findUnique({
      where: { id: dto.sedeId },
    });
    if (!sede) throw new NotFoundException('Sede no encontrada');
    const max = await this.prisma.landingHabitacion.aggregate({
      where: { sedeId: dto.sedeId },
      _max: { orden: true },
    });
    return this.prisma.landingHabitacion.create({
      data: {
        sedeId: dto.sedeId,
        nombre: dto.nombre.trim(),
        descripcion: dto.descripcion ?? null,
        caracteristicas: dto.caracteristicas ?? null,
        precioNoche: dto.precioNoche ?? null,
        precioHora: dto.precioHora ?? null,
        capacidad: dto.capacidad ?? null,
        camas: dto.camas ?? null,
        orden: (max._max.orden ?? -1) + 1,
        activo: dto.activo ?? true,
      },
      include: { fotos: true },
    });
  }

  async actualizarHabitacion(id: number, dto: HabitacionInput) {
    await this.findHabitacion(id);
    const { sedeId, ...rest } = dto; // no permitimos mover de sede al editar
    return this.prisma.landingHabitacion.update({
      where: { id },
      data: rest as any,
      include: { fotos: { orderBy: [{ orden: 'asc' }, { id: 'asc' }] } },
    });
  }

  async eliminarHabitacion(id: number) {
    await this.findHabitacion(id);
    await this.prisma.landingHabitacion.delete({ where: { id } });
    return { ok: true };
  }

  async reordenarHabitaciones(ids: number[]) {
    if (!Array.isArray(ids) || ids.length === 0)
      throw new BadRequestException('Lista de ids vacía');
    await this.prisma.$transaction(
      ids.map((id, i) =>
        this.prisma.landingHabitacion.update({
          where: { id },
          data: { orden: i },
        }),
      ),
    );
    return { ok: true };
  }

  /** Agrega una foto a la maqueta (al final). */
  async agregarFoto(habitacionId: number, path: string) {
    await this.findHabitacion(habitacionId);
    const max = await this.prisma.landingHabitacionFoto.aggregate({
      where: { habitacionId },
      _max: { orden: true },
    });
    await this.prisma.landingHabitacionFoto.create({
      data: { habitacionId, path, orden: (max._max.orden ?? -1) + 1 },
    });
    return this.findHabitacion(habitacionId);
  }

  async eliminarFoto(fotoId: number) {
    const f = await this.prisma.landingHabitacionFoto.findUnique({
      where: { id: fotoId },
    });
    if (!f) throw new NotFoundException('Foto no encontrada');
    await this.prisma.landingHabitacionFoto.delete({ where: { id: fotoId } });
    return this.findHabitacion(f.habitacionId);
  }

  async reordenarFotos(habitacionId: number, ids: number[]) {
    await this.findHabitacion(habitacionId);
    await this.prisma.$transaction(
      ids.map((id, i) =>
        this.prisma.landingHabitacionFoto.update({
          where: { id },
          data: { orden: i },
        }),
      ),
    );
    return this.findHabitacion(habitacionId);
  }
}
