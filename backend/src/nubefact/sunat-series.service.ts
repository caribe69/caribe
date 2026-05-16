import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { TipoComprobanteSerie } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from '../auth/auth.service';
import { enforceSede } from '../common/sede-scope';

/**
 * Administra las series SUNAT (B001, F001, etc.) por sede.
 *
 * Cada sede tiene sus propias series con un correlativo independiente.
 * El admin inicializa el correlativo viendo el último emitido en su panel
 * NubeFact; el sistema incrementa atómicamente con cada emisión.
 *
 * Si NubeFact rechaza con código 23 (documento ya existe), el caller
 * puede llamar a sincronizarConsultando() para encontrar el próximo libre.
 */
@Injectable()
export class SunatSeriesService {
  constructor(private prisma: PrismaService) {}

  /** Lista series visibles para el usuario (SUPERADMIN: todas; resto: solo su sede). */
  async listar(user: JwtPayload, sedeIdQuery?: number) {
    const where: any = {};
    if (user.rol === 'SUPERADMIN') {
      if (sedeIdQuery) where.sedeId = sedeIdQuery;
    } else {
      if (user.sedeId == null)
        throw new ForbiddenException('Usuario sin sede asignada');
      where.sedeId = user.sedeId;
    }
    return this.prisma.sunatSerie.findMany({
      where,
      orderBy: [{ sedeId: 'asc' }, { tipo: 'asc' }, { serie: 'asc' }],
      include: { sede: { select: { id: true, nombre: true } } },
    });
  }

  async findOne(id: number, user: JwtPayload) {
    const serie = await this.prisma.sunatSerie.findUnique({
      where: { id },
      include: { sede: true },
    });
    if (!serie) throw new NotFoundException('Serie no encontrada');
    enforceSede(user, serie.sedeId);
    return serie;
  }

  /** Crea una nueva serie. Valida formato y unicidad por (sede, serie). */
  async crear(
    user: JwtPayload,
    dto: {
      sedeId: number;
      tipo: TipoComprobanteSerie;
      serie: string;
      ultimoCorrelativo?: number;
      esPredeterminada?: boolean;
      notas?: string;
    },
  ) {
    enforceSede(user, dto.sedeId);
    this.validarFormato(dto.tipo, dto.serie);

    const correlativo = Math.max(0, Math.floor(dto.ultimoCorrelativo ?? 0));
    if (correlativo > 99_999_999)
      throw new BadRequestException(
        'El correlativo no puede superar 99,999,999 (8 dígitos)',
      );

    return this.prisma.$transaction(async (tx) => {
      if (dto.esPredeterminada) {
        // Solo una predeterminada por (sede, tipo)
        await tx.sunatSerie.updateMany({
          where: { sedeId: dto.sedeId, tipo: dto.tipo, esPredeterminada: true },
          data: { esPredeterminada: false },
        });
      }
      try {
        return await tx.sunatSerie.create({
          data: {
            sedeId: dto.sedeId,
            tipo: dto.tipo,
            serie: dto.serie.toUpperCase(),
            ultimoCorrelativo: correlativo,
            esPredeterminada: dto.esPredeterminada ?? false,
            notas: dto.notas?.trim() || null,
          },
        });
      } catch (e: any) {
        if (e?.code === 'P2002')
          throw new ConflictException(
            `La serie ${dto.serie} ya existe en esta sede`,
          );
        throw e;
      }
    });
  }

  async actualizar(
    id: number,
    user: JwtPayload,
    dto: {
      ultimoCorrelativo?: number;
      activa?: boolean;
      esPredeterminada?: boolean;
      notas?: string;
    },
  ) {
    const actual = await this.findOne(id, user);
    if (
      dto.ultimoCorrelativo != null &&
      (dto.ultimoCorrelativo < 0 || dto.ultimoCorrelativo > 99_999_999)
    ) {
      throw new BadRequestException(
        'El correlativo debe estar entre 0 y 99,999,999',
      );
    }
    return this.prisma.$transaction(async (tx) => {
      if (dto.esPredeterminada) {
        await tx.sunatSerie.updateMany({
          where: {
            sedeId: actual.sedeId,
            tipo: actual.tipo,
            esPredeterminada: true,
            NOT: { id },
          },
          data: { esPredeterminada: false },
        });
      }
      return tx.sunatSerie.update({
        where: { id },
        data: {
          ultimoCorrelativo: dto.ultimoCorrelativo ?? undefined,
          activa: dto.activa ?? undefined,
          esPredeterminada: dto.esPredeterminada ?? undefined,
          notas:
            dto.notas !== undefined ? dto.notas.trim() || null : undefined,
        },
      });
    });
  }

  async eliminar(id: number, user: JwtPayload) {
    await this.findOne(id, user);
    await this.prisma.sunatSerie.delete({ where: { id } });
    return { ok: true };
  }

  /**
   * Reserva el siguiente correlativo libre para emitir.
   * Atómico: usa UPDATE ... RETURNING para evitar race conditions.
   *
   * Si no hay serie configurada para esta sede+tipo, lanza error claro
   * para que el usuario sepa que debe configurarla en Settings.
   */
  async reservarSiguiente(
    sedeId: number,
    tipo: TipoComprobanteSerie,
    serieEspecifica?: string,
  ): Promise<{ serie: string; numero: number; serieId: number }> {
    // 1. Buscar la serie a usar
    let serie;
    if (serieEspecifica) {
      serie = await this.prisma.sunatSerie.findFirst({
        where: {
          sedeId,
          tipo,
          serie: serieEspecifica.toUpperCase(),
          activa: true,
        },
      });
    } else {
      // Predeterminada o la primera activa
      serie = await this.prisma.sunatSerie.findFirst({
        where: { sedeId, tipo, activa: true, esPredeterminada: true },
      });
      if (!serie) {
        serie = await this.prisma.sunatSerie.findFirst({
          where: { sedeId, tipo, activa: true },
          orderBy: { id: 'asc' },
        });
      }
    }

    if (!serie) {
      throw new BadRequestException(
        `No hay serie SUNAT configurada para ${tipo === 'FACTURA' ? 'facturas' : 'boletas'} en esta sede. ` +
          `Ve a Configuración → Series SUNAT y registra una serie con el último correlativo emitido en NubeFact.`,
      );
    }

    // 2. Incremento atómico
    const updated = await this.prisma.sunatSerie.update({
      where: { id: serie.id },
      data: { ultimoCorrelativo: { increment: 1 } },
    });

    return {
      serie: updated.serie,
      numero: updated.ultimoCorrelativo,
      serieId: updated.id,
    };
  }

  /**
   * Revierte la última reserva si la emisión falló (NubeFact rechazó por
   * algo distinto a colisión, ej. red caída o token inválido). Solo hace
   * decrement si el correlativo actual coincide con el que se reservó —
   * si entre medio otro proceso ya reservó otro número, no tocamos nada
   * para no romper la secuencia.
   *
   * SUNAT exige correlativos secuenciales sin saltos: si un comprobante
   * "fue reservado" pero nunca se envió, hay que recuperar ese número.
   */
  async revertirReserva(serieId: number, numeroReservado: number) {
    const actual = await this.prisma.sunatSerie.findUnique({
      where: { id: serieId },
    });
    if (!actual) return null;
    // Solo retrocedemos si nadie más avanzó después de nosotros.
    if (actual.ultimoCorrelativo !== numeroReservado) return actual;
    return this.prisma.sunatSerie.update({
      where: { id: serieId },
      data: { ultimoCorrelativo: numeroReservado - 1 },
    });
  }

  /**
   * Setea el correlativo de una serie a un valor específico (por recovery
   * después de un error 23, o ajuste manual). Solo avanza, nunca retrocede
   * por seguridad — para retroceder hay que usar actualizar() explícitamente.
   */
  async sincronizar(serieId: number, nuevoUltimoCorrelativo: number) {
    if (nuevoUltimoCorrelativo < 0 || nuevoUltimoCorrelativo > 99_999_999)
      throw new BadRequestException('Correlativo fuera de rango');
    const actual = await this.prisma.sunatSerie.findUnique({
      where: { id: serieId },
    });
    if (!actual) throw new NotFoundException('Serie no encontrada');
    if (nuevoUltimoCorrelativo <= actual.ultimoCorrelativo) return actual;

    // Bug fix: si en algún Alquiler/Venta local ya existe un comprobante
    // con un número >= al nuevo, sincronizar hacia ese valor pisaría
    // correlativos ya emitidos. Validamos antes de avanzar.
    const [maxAlq, maxVen] = await Promise.all([
      this.prisma.alquiler.aggregate({
        where: { sunatSerie: actual.serie },
        _max: { sunatNumero: true },
      }),
      this.prisma.venta.aggregate({
        where: { sunatSerie: actual.serie },
        _max: { sunatNumero: true },
      }),
    ]);
    const maxUsado = Math.max(
      maxAlq._max.sunatNumero ?? 0,
      maxVen._max.sunatNumero ?? 0,
    );
    if (nuevoUltimoCorrelativo < maxUsado) {
      throw new BadRequestException(
        `No se puede sincronizar a ${nuevoUltimoCorrelativo}: ya hay un comprobante local con número ${maxUsado} en la serie ${actual.serie}`,
      );
    }

    return this.prisma.sunatSerie.update({
      where: { id: serieId },
      data: { ultimoCorrelativo: nuevoUltimoCorrelativo },
    });
  }

  /** Valida que la serie tenga el formato SUNAT correcto. */
  private validarFormato(tipo: TipoComprobanteSerie, serie: string) {
    if (!serie || serie.length !== 4) {
      throw new BadRequestException(
        'La serie debe tener exactamente 4 caracteres (ej: B001, F001)',
      );
    }
    const letraEsperada = tipo === 'FACTURA' ? 'F' : 'B';
    if (!new RegExp(`^${letraEsperada}\\d{3}$`, 'i').test(serie)) {
      throw new BadRequestException(
        `La serie para ${tipo} debe empezar con "${letraEsperada}" seguida de 3 dígitos (ej: ${letraEsperada}001)`,
      );
    }
  }
}
