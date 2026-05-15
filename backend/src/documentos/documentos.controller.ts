import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { mkdirSync } from 'fs';
import { IsDateString, IsInt, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { Rol } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtPayload } from '../auth/auth.service';
import { DocumentosService } from './documentos.service';

const DIR = join(process.cwd(), 'uploads', 'documentos');
try {
  mkdirSync(DIR, { recursive: true });
} catch {}

class CrearDocumentoDto {
  @IsString() nombre!: string;
  @IsOptional() @IsString() descripcion?: string;
  @IsOptional() @IsDateString() fechaEmision?: string;
  @IsOptional() @IsDateString() fechaVencimiento?: string;
  @IsOptional() @Type(() => Number) @IsInt() alertaDiasAntes?: number;
  @IsOptional() @Type(() => Number) @IsInt() sedeId?: number;
}

class UpdateDocumentoDto {
  @IsOptional() @IsString() nombre?: string;
  @IsOptional() @IsString() descripcion?: string;
  @IsOptional() @IsDateString() fechaEmision?: string;
  @IsOptional() @IsDateString() fechaVencimiento?: string;
  @IsOptional() @Type(() => Number) @IsInt() alertaDiasAntes?: number;
  @IsOptional() @Type(() => Number) @IsInt() sedeId?: number;
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('documentos')
export class DocumentosController {
  constructor(private readonly service: DocumentosService) {}

  @Get()
  listar(
    @CurrentUser() user: JwtPayload,
    @Query('sedeId') sedeIdQuery?: string,
  ) {
    return this.service.listar(
      user,
      sedeIdQuery ? Number(sedeIdQuery) : undefined,
    );
  }

  @Get('alertas')
  alertas(@CurrentUser() user: JwtPayload) {
    return this.service.alertas(user);
  }

  @Roles(Rol.SUPERADMIN, Rol.ADMIN_SEDE)
  @Post()
  @UseInterceptors(
    FileInterceptor('archivo', {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          try {
            mkdirSync(DIR, { recursive: true });
          } catch {}
          cb(null, DIR);
        },
        filename: (_req, file, cb) => {
          const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
          cb(null, `doc_${Date.now()}_${safe}`);
        },
      }),
      limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB
      fileFilter: (_req, file, cb) => {
        if (!/\.(pdf|png|jpe?g|webp|gif|heic|tiff?)$/i.test(file.originalname))
          return cb(new Error('Formato no admitido (PDF / imagen)'), false);
        cb(null, true);
      },
    }),
  )
  async crear(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: CrearDocumentoDto,
    @CurrentUser() user: JwtPayload,
  ) {
    if (!file) throw new BadRequestException('Archivo requerido');
    const ext = extname(file.originalname).toLowerCase();
    const tipo: 'PDF' | 'IMAGEN' | 'OTRO' = ext === '.pdf'
      ? 'PDF'
      : /^\.(png|jpe?g|webp|gif|heic|tiff?)$/.test(ext)
        ? 'IMAGEN'
        : 'OTRO';

    return this.service.crear(
      {
        nombre: dto.nombre,
        descripcion: dto.descripcion ?? null,
        tipo,
        archivoPath: `/uploads/documentos/${file.filename}`,
        archivoNombre: file.originalname,
        fechaEmision: dto.fechaEmision ? new Date(dto.fechaEmision) : null,
        fechaVencimiento: dto.fechaVencimiento
          ? new Date(dto.fechaVencimiento)
          : null,
        alertaDiasAntes: dto.alertaDiasAntes ?? 30,
        sedeId: dto.sedeId ?? user.sedeId ?? null,
      },
      user,
    );
  }

  @Roles(Rol.SUPERADMIN, Rol.ADMIN_SEDE)
  @Patch(':id')
  actualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateDocumentoDto,
  ) {
    return this.service.actualizar(id, {
      nombre: dto.nombre,
      descripcion: dto.descripcion,
      fechaEmision: dto.fechaEmision ? new Date(dto.fechaEmision) : undefined,
      fechaVencimiento: dto.fechaVencimiento
        ? new Date(dto.fechaVencimiento)
        : undefined,
      alertaDiasAntes: dto.alertaDiasAntes,
      sedeId: dto.sedeId,
    });
  }

  @Roles(Rol.SUPERADMIN, Rol.ADMIN_SEDE)
  @Delete(':id')
  eliminar(@Param('id', ParseIntPipe) id: number) {
    return this.service.eliminar(id);
  }
}
