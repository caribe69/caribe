import { Injectable } from '@nestjs/common';
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
    };
  }

  async getFull() {
    return this.ensureRow();
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
