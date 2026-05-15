import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from '../auth/auth.service';
import { resolveSedeId } from '../common/sede-scope';
import { unlink } from 'fs/promises';
import { join } from 'path';

interface UpdateDocumentoInput {
  nombre?: string;
  descripcion?: string | null;
  fechaEmision?: Date | null;
  fechaVencimiento?: Date | null;
  alertaDiasAntes?: number;
  sedeId?: number | null;
}

@Injectable()
export class DocumentosService {
  constructor(private prisma: PrismaService) {}

  async listar(user: JwtPayload, sedeIdQuery?: number) {
    const where: any = {};
    if (user.rol !== 'SUPERADMIN') {
      where.OR = [
        { sedeId: resolveSedeId(user, sedeIdQuery) },
        { sedeId: null },
      ];
    } else if (sedeIdQuery) {
      where.sedeId = sedeIdQuery;
    }
    return this.prisma.documento.findMany({
      where,
      orderBy: [{ fechaVencimiento: 'asc' }, { creadoEn: 'desc' }],
    });
  }

  async findOne(id: number) {
    const doc = await this.prisma.documento.findUnique({ where: { id } });
    if (!doc) throw new NotFoundException('Documento no encontrado');
    return doc;
  }

  async crear(
    data: {
      nombre: string;
      descripcion?: string | null;
      tipo: 'PDF' | 'IMAGEN' | 'OTRO';
      archivoPath: string;
      archivoNombre?: string | null;
      fechaEmision?: Date | null;
      fechaVencimiento?: Date | null;
      alertaDiasAntes?: number;
      sedeId?: number | null;
    },
    user: JwtPayload,
  ) {
    if (!data.nombre) throw new BadRequestException('Nombre requerido');
    return this.prisma.documento.create({
      data: {
        ...data,
        creadoPorId: user.sub,
      },
    });
  }

  async actualizar(id: number, dto: UpdateDocumentoInput) {
    await this.findOne(id);
    return this.prisma.documento.update({
      where: { id },
      data: dto as any,
    });
  }

  async eliminar(id: number) {
    const doc = await this.findOne(id);
    // Borra archivo físico (best effort)
    try {
      if (doc.archivoPath?.startsWith('/uploads/')) {
        const abs = join(process.cwd(), doc.archivoPath.replace(/^\/+/, ''));
        await unlink(abs).catch(() => {});
      }
    } catch {}
    return this.prisma.documento.delete({ where: { id } });
  }

  /** Resumen para alertas en dashboard */
  async alertas(user: JwtPayload) {
    const todos = await this.listar(user);
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const porVencer: any[] = [];
    const vencidos: any[] = [];
    for (const d of todos) {
      if (!d.fechaVencimiento) continue;
      const venc = new Date(d.fechaVencimiento);
      const diasRestantes = Math.ceil(
        (venc.getTime() - hoy.getTime()) / 86_400_000,
      );
      if (diasRestantes < 0) vencidos.push({ ...d, diasRestantes });
      else if (diasRestantes <= d.alertaDiasAntes)
        porVencer.push({ ...d, diasRestantes });
    }
    return { porVencer, vencidos };
  }
}
