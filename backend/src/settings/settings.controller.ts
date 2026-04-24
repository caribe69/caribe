import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { mkdirSync } from 'fs';
import {
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { Rol } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtPayload } from '../auth/auth.service';
import { SettingsService } from './settings.service';

const LOGO_DIR = join(process.cwd(), 'uploads', 'logos');
try {
  mkdirSync(LOGO_DIR, { recursive: true });
} catch {}

class UpdateSettingsDto {
  @IsOptional() @IsString() @MaxLength(120) empresaNombre?: string;
  @IsOptional() @IsString() @MaxLength(20) empresaRuc?: string;
  @IsOptional() @IsString() @MaxLength(200) empresaDireccion?: string;
  @IsOptional() @IsString() @MaxLength(40) empresaTelefono?: string;
  @IsOptional() @IsEmail() empresaEmail?: string;
  @IsOptional() @IsString() apiDniToken?: string;
  @IsOptional() @IsString() apiRucToken?: string;
  @IsOptional() @IsUrl() apiDniUrl?: string;
  @IsOptional() @IsUrl() apiRucUrl?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(365) sessionTtlDays?: number;
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('settings')
export class SettingsController {
  constructor(private readonly service: SettingsService) {}

  /** Lectura pública (para el branding del sidebar/login) */
  @Get()
  getPublic(@CurrentUser() user: JwtPayload) {
    if (user.rol === 'SUPERADMIN' || user.rol === 'ADMIN_SEDE')
      return this.service.getFull();
    return this.service.getPublic();
  }

  @Roles(Rol.SUPERADMIN, Rol.ADMIN_SEDE)
  @Patch()
  update(@Body() dto: UpdateSettingsDto) {
    return this.service.update(dto);
  }

  @Roles(Rol.SUPERADMIN, Rol.ADMIN_SEDE)
  @Post('logo')
  @UseInterceptors(
    FileInterceptor('logo', {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          try {
            mkdirSync(LOGO_DIR, { recursive: true });
          } catch {}
          cb(null, LOGO_DIR);
        },
        filename: (_req, file, cb) => {
          const name = 'logo_' + Date.now() + extname(file.originalname);
          cb(null, name);
        },
      }),
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        if (!/\.(jpg|jpeg|png|webp|svg)$/i.test(file.originalname))
          return cb(new Error('Formato no admitido'), false);
        cb(null, true);
      },
    }),
  )
  async subirLogo(@UploadedFile() file: Express.Multer.File) {
    const path = `/uploads/logos/${file.filename}`;
    return this.service.update({ logoPath: path });
  }
}
