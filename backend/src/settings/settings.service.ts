import { BadRequestException, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';

export interface UpdateSettingsInput {
  empresaNombre?: string | null;
  empresaRuc?: string | null;
  empresaDireccion?: string | null;
  empresaTelefono?: string | null;
  empresaEmail?: string | null;
  logoPath?: string | null;
  apiDniToken?: string | null;
  apiRucToken?: string | null;
  apiDniUrl?: string;
  apiRucUrl?: string;
  sessionTtlDays?: number;
  // NubeFact / facturación electrónica
  nubefactRuta?: string | null;
  nubefactToken?: string | null;
  nubefactSerieFactura?: string;
  nubefactSerieBoleta?: string;
  nubefactSerieNotaCred?: string;
  nubefactSerieNotaDeb?: string;
  nubefactIgvHospedaje?: number | string;
  nubefactIgvProductos?: number | string;
}

@Injectable()
export class SettingsService {
  constructor(private prisma: PrismaService) {}

  async ensureRow() {
    const existing = await this.prisma.appConfig.findUnique({ where: { id: 1 } });
    if (existing) return existing;
    return this.prisma.appConfig.create({ data: { id: 1 } });
  }

  async getPublic() {
    const cfg = await this.ensureRow();
    // No devolvemos los tokens a usuarios no-admin
    return {
      id: cfg.id,
      empresaNombre: cfg.empresaNombre,
      empresaRuc: cfg.empresaRuc,
      empresaDireccion: cfg.empresaDireccion,
      empresaTelefono: cfg.empresaTelefono,
      empresaEmail: cfg.empresaEmail,
      logoPath: cfg.logoPath,
      sessionTtlDays: cfg.sessionTtlDays,
      // Series visibles (no contienen secretos)
      nubefactSerieFactura: cfg.nubefactSerieFactura,
      nubefactSerieBoleta: cfg.nubefactSerieBoleta,
      nubefactIgvHospedaje: cfg.nubefactIgvHospedaje,
      nubefactIgvProductos: cfg.nubefactIgvProductos,
      nubefactConfigured: !!(cfg.nubefactRuta && cfg.nubefactToken),
      claveEliminacionConfigurada: !!cfg.claveEliminacionHash,
    };
  }

  /** Define/actualiza la clave de eliminación (se guarda hasheada). */
  async setClaveEliminacion(clave: string) {
    if (!clave || clave.length < 4)
      throw new BadRequestException(
        'La clave de eliminación debe tener al menos 4 caracteres',
      );
    await this.ensureRow();
    const hash = await bcrypt.hash(clave, 10);
    await this.prisma.appConfig.update({
      where: { id: 1 },
      data: { claveEliminacionHash: hash },
    });
    return { ok: true, configurada: true };
  }

  /** Verifica la clave de eliminación contra el hash guardado. */
  async verificarClaveEliminacion(clave: string): Promise<boolean> {
    const cfg = await this.ensureRow();
    if (!cfg.claveEliminacionHash) return false;
    if (!clave) return false;
    return bcrypt.compare(clave, cfg.claveEliminacionHash);
  }

  /** ¿Ya hay una clave de eliminación configurada? */
  async claveEliminacionConfigurada(): Promise<boolean> {
    const cfg = await this.ensureRow();
    return !!cfg.claveEliminacionHash;
  }

  async getFull() {
    const cfg = await this.ensureRow();
    // No exponer el hash de la clave de eliminación; solo si está configurada.
    const { claveEliminacionHash, ...resto } = cfg;
    return { ...resto, claveEliminacionConfigurada: !!claveEliminacionHash };
  }

  async update(data: UpdateSettingsInput) {
    await this.ensureRow();
    // Validar sessionTtlDays si viene
    if (data.sessionTtlDays !== undefined) {
      const n = Number(data.sessionTtlDays);
      if (!Number.isFinite(n) || n < 1 || n > 365) {
        throw new Error('sessionTtlDays debe estar entre 1 y 365');
      }
      data = { ...data, sessionTtlDays: Math.floor(n) };
    }
    return this.prisma.appConfig.update({
      where: { id: 1 },
      data,
    });
  }

  async getDniConfig() {
    const cfg = await this.ensureRow();
    return {
      token: cfg.apiDniToken,
      url: cfg.apiDniUrl,
    };
  }

  async getRucConfig() {
    const cfg = await this.ensureRow();
    return {
      token: cfg.apiRucToken,
      url: cfg.apiRucUrl,
    };
  }
}
