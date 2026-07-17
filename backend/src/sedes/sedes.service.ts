import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSedeDto, UpdateSedeDto } from './sede.dto';
import { promises as fs } from 'fs';
import { join } from 'path';

@Injectable()
export class SedesService {
  constructor(private prisma: PrismaService) {}

  /** Suma de datos operativos de una sede (para saber si está "vacía"). */
  private static readonly OP_COUNT = {
    edificios: true,
    habitaciones: true,
    productos: true,
    ventas: true,
    alquileres: true,
    turnosCaja: true,
    usuarios: true,
    personal: true,
  } as const;

  private static tieneOperacion(c: any): boolean {
    return (
      (c.habitaciones ?? 0) +
        (c.productos ?? 0) +
        (c.ventas ?? 0) +
        (c.alquileres ?? 0) +
        (c.turnosCaja ?? 0) +
        (c.usuarios ?? 0) +
        (c.personal ?? 0) >
      0
    );
  }

  async findAll() {
    const sedes = await this.prisma.sede.findMany({
      orderBy: { id: 'asc' },
      include: {
        fotos: { orderBy: { orden: 'asc' } },
        _count: { select: SedesService.OP_COUNT },
      },
    });
    return sedes.map((s) => {
      const esAgrupador = (s._count.edificios ?? 0) > 0;
      // Puede ser padre si es de nivel superior y está "vacía" (o ya agrupa).
      const puedeSerPadre =
        s.sedePadreId == null &&
        (esAgrupador || !SedesService.tieneOperacion(s._count));
      return { ...s, esAgrupador, puedeSerPadre };
    });
  }

  async findOne(id: number) {
    const sede = await this.prisma.sede.findUnique({
      where: { id },
      include: {
        fotos: { orderBy: { orden: 'asc' } },
        _count: { select: { edificios: true } },
      },
    });
    if (!sede) throw new NotFoundException('Sede no encontrada');
    return sede;
  }

  /**
   * Valida la jerarquía de edificios (1 solo nivel):
   * - el padre debe existir, estar activo y NO ser a su vez un edificio;
   * - una sede que YA tiene edificios no puede convertirse en edificio;
   * - una sede no puede ser su propio padre.
   */
  private async validarPadre(sedeId: number | null, padreId: number) {
    if (sedeId && padreId === sedeId)
      throw new BadRequestException('Una sede no puede ser su propio padre');
    const padre = await this.prisma.sede.findUnique({
      where: { id: padreId },
      select: { id: true, sedePadreId: true, _count: { select: SedesService.OP_COUNT } },
    });
    if (!padre)
      throw new BadRequestException('La sede padre indicada no existe');
    if (padre.sedePadreId)
      throw new BadRequestException(
        'Solo se permite 1 nivel: la sede padre no puede ser a su vez un edificio',
      );
    // El padre debe ser un AGRUPADOR: una sede vacía creada solo para agrupar.
    // Si ya tiene operación (habitaciones, productos, ventas, usuarios…) no
    // puede ser padre — así se evita confundir sedes operativas con complejos.
    const yaAgrupa = (padre._count.edificios ?? 0) > 0;
    if (!yaAgrupa && SedesService.tieneOperacion(padre._count))
      throw new BadRequestException(
        'La sede padre debe ser una sede vacía creada solo para agrupar. ' +
          'Esa sede ya tiene operación (habitaciones, productos, usuarios, etc.). ' +
          'Crea una sede nueva vacía como complejo y cuelga los edificios de ella.',
      );
    if (sedeId) {
      const tieneHijos = await this.prisma.sede.count({
        where: { sedePadreId: sedeId },
      });
      if (tieneHijos > 0)
        throw new BadRequestException(
          'Esta sede ya tiene edificios; no puede volverse edificio de otra',
        );
    }
  }

  async create(dto: CreateSedeDto) {
    if (dto.sedePadreId != null) {
      await this.validarPadre(null, dto.sedePadreId);
    }
    return this.prisma.sede.create({ data: dto as any });
  }

  async update(id: number, dto: UpdateSedeDto) {
    await this.findOne(id);
    if (dto.sedePadreId != null) {
      await this.validarPadre(id, dto.sedePadreId);
    }
    return this.prisma.sede.update({ where: { id }, data: dto as any });
  }

  /**
   * Agrega un edificio a una sede (flujo natural desde la sede misma):
   * - Si la sede ya es un complejo (agrupador) → crea otro edificio y listo.
   * - Si es una sede normal → la convierte en complejo: crea el agrupador
   *   padre (con el nombre actual), mueve la sede debajo como "Edificio 1"
   *   conservando TODOS sus datos, **mueve sus series SUNAT al padre** para
   *   que ambos edificios compartan correlativo (boletas no se repiten), y
   *   crea el nuevo edificio. Todo atómico.
   */
  async agregarEdificio(
    id: number,
    nombreNuevo: string,
    nombreActual?: string,
  ) {
    const sede = await this.prisma.sede.findUnique({
      where: { id },
      select: {
        id: true,
        nombre: true,
        sedePadreId: true,
        _count: { select: { edificios: true } },
      },
    });
    if (!sede) throw new NotFoundException('Sede no encontrada');
    if (!nombreNuevo || !nombreNuevo.trim())
      throw new BadRequestException('Falta el nombre del nuevo edificio');
    if (sede.sedePadreId)
      throw new BadRequestException(
        'Esta sede ya es un edificio. Agrega el edificio desde su complejo.',
      );

    // Ya es complejo: solo agregar un edificio más
    if ((sede._count.edificios ?? 0) > 0) {
      return this.prisma.sede.create({
        data: { nombre: nombreNuevo.trim(), sedePadreId: id },
      });
    }

    // Convertir sede normal en complejo (atómico)
    return this.prisma.$transaction(async (tx) => {
      const complejo = await tx.sede.create({ data: { nombre: sede.nombre } });
      // Las series pasan al complejo → los edificios comparten correlativo
      await tx.sunatSerie.updateMany({
        where: { sedeId: id },
        data: { sedeId: complejo.id },
      });
      // La sede actual pasa a ser edificio del complejo (conserva sus datos)
      await tx.sede.update({
        where: { id },
        data: {
          sedePadreId: complejo.id,
          nombre: nombreActual?.trim() || 'Edificio 1',
        },
      });
      const nuevo = await tx.sede.create({
        data: { nombre: nombreNuevo.trim(), sedePadreId: complejo.id },
      });
      return { complejoId: complejo.id, edificioActualId: id, nuevoId: nuevo.id };
    });
  }

  async toggleActiva(id: number) {
    const sede = await this.findOne(id);
    return this.prisma.sede.update({
      where: { id },
      data: { activa: !sede.activa },
    });
  }

  async setPrincipal(id: number) {
    await this.findOne(id);
    return this.prisma.$transaction(async (tx) => {
      await tx.sede.updateMany({
        where: { esPrincipal: true, NOT: { id } },
        data: { esPrincipal: false },
      });
      return tx.sede.update({
        where: { id },
        data: { esPrincipal: true },
      });
    });
  }

  // ────────────────────────────────────────────────────────────
  // Fotos
  // ────────────────────────────────────────────────────────────
  async listarFotos(sedeId: number) {
    await this.findOne(sedeId);
    return this.prisma.fotoSede.findMany({
      where: { sedeId },
      orderBy: { orden: 'asc' },
    });
  }

  async subirFotos(sedeId: number, files: Express.Multer.File[]) {
    await this.findOne(sedeId);
    if (!files || files.length === 0) {
      throw new BadRequestException('Subí al menos una foto');
    }
    const existentes = await this.prisma.fotoSede.count({ where: { sedeId } });
    const creadas: { id: number; path: string; orden: number }[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const foto = await this.prisma.fotoSede.create({
        data: {
          sedeId,
          path: `/uploads/sedes/${file.filename}`,
          orden: existentes + i,
        },
      });
      creadas.push({ id: foto.id, path: foto.path, orden: foto.orden });
    }
    return creadas;
  }

  async eliminarFoto(sedeId: number, fotoId: number) {
    const foto = await this.prisma.fotoSede.findFirst({
      where: { id: fotoId, sedeId },
    });
    if (!foto) throw new NotFoundException('Foto no encontrada');
    try {
      const filePath = join(process.cwd(), foto.path.replace(/^\/+/, ''));
      await fs.unlink(filePath).catch(() => {});
    } catch {
      // ignorar errores de borrado en disco
    }
    await this.prisma.fotoSede.delete({ where: { id: fotoId } });
    return { ok: true };
  }
}
