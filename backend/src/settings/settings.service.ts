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
    };
  }

  async getFull() {
    return this.ensureRow();
  }

  async update(data: UpdateSettingsInput) {
    await this.ensureRow();
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
}
