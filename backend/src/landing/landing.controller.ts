import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
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
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { Rol } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { LandingService } from './landing.service';
import { ImageProcessorService } from '../common/image-processor.service';

const DIR = join(process.cwd(), 'uploads', 'landing');
try {
  mkdirSync(DIR, { recursive: true });
} catch {}

const storage = diskStorage({
  destination: (_req, _file, cb) => {
    try {
      mkdirSync(DIR, { recursive: true });
    } catch {}
    cb(null, DIR);
  },
  filename: (_req, file, cb) => {
    cb(null, `slide_${Date.now()}_${Math.random().toString(36).slice(2, 8)}${extname(file.originalname)}`);
  },
});

class SlideDto {
  @IsOptional() @IsString() titulo?: string;
  @IsOptional() @IsString() subtitulo?: string;
  @IsOptional() @IsString() descripcion?: string;
  @IsOptional() @IsString() precio?: string;
  @IsOptional() @IsString() beneficios?: string;
  @IsOptional() @IsString() botonTexto?: string;
  @IsOptional() @IsString() botonUrl?: string;
  @IsOptional() @Type(() => Number) @IsInt() orden?: number;
  @IsOptional() @IsBoolean() activo?: boolean;
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Rol.SUPERADMIN, Rol.ADMIN_SEDE)
@Controller('landing-slides')
export class LandingController {
  constructor(
    private readonly service: LandingService,
    private readonly imageProcessor: ImageProcessorService,
  ) {}

  @Get()
  listar() {
    return this.service.listar();
  }

  @Post()
  crear(@Body() dto: SlideDto) {
    return this.service.crear(dto);
  }

  @Patch('reordenar')
  reordenar(@Body() body: { ids: number[] }) {
    return this.service.reordenar((body?.ids || []).map(Number));
  }

  @Patch(':id')
  actualizar(@Param('id', ParseIntPipe) id: number, @Body() dto: SlideDto) {
    return this.service.actualizar(id, dto);
  }

  @Post(':id/imagen')
  @UseInterceptors(
    FileInterceptor('imagen', {
      storage,
      limits: { fileSize: 10 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        if (!/\.(png|jpe?g|webp)$/i.test(file.originalname))
          return cb(new Error('Formato no admitido (PNG/JPG/WEBP)'), false);
        cb(null, true);
      },
    }),
  )
  async subirImagen(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('Sube una imagen');
    await this.imageProcessor.processMany([file.path]).catch(() => {});
    return this.service.setImagen(id, `/uploads/landing/${file.filename}`);
  }

  @Delete(':id')
  eliminar(@Param('id', ParseIntPipe) id: number) {
    return this.service.eliminar(id);
  }
}
