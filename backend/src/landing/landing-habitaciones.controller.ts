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
  Query,
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
  MaxLength,
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
    cb(
      null,
      `hab_${Date.now()}_${Math.random().toString(36).slice(2, 8)}${extname(file.originalname)}`,
    );
  },
});

class HabitacionDto {
  @IsOptional() @Type(() => Number) @IsInt() sedeId?: number;
  @IsOptional() @IsString() @MaxLength(120) nombre?: string;
  @IsOptional() @IsString() descripcion?: string;
  @IsOptional() @IsString() caracteristicas?: string;
  @IsOptional() @IsString() @MaxLength(40) precioNoche?: string;
  @IsOptional() @IsString() @MaxLength(40) precioHora?: string;
  @IsOptional() @Type(() => Number) @IsInt() capacidad?: number;
  @IsOptional() @IsString() @MaxLength(60) camas?: string;
  @IsOptional() @IsBoolean() activo?: boolean;
}

// ── Habitaciones-maqueta ──
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Rol.SUPERADMIN, Rol.ADMIN_SEDE)
@Controller('landing-habitaciones')
export class LandingHabitacionesController {
  constructor(
    private readonly service: LandingService,
    private readonly imageProcessor: ImageProcessorService,
  ) {}

  @Get()
  listar(@Query('sedeId', ParseIntPipe) sedeId: number) {
    return this.service.listarHabitaciones(sedeId);
  }

  @Post()
  crear(@Body() dto: HabitacionDto) {
    return this.service.crearHabitacion(dto);
  }

  @Patch('reordenar')
  reordenar(@Body() body: { ids: number[] }) {
    return this.service.reordenarHabitaciones((body?.ids || []).map(Number));
  }

  @Patch(':id')
  actualizar(@Param('id', ParseIntPipe) id: number, @Body() dto: HabitacionDto) {
    return this.service.actualizarHabitacion(id, dto);
  }

  @Delete(':id')
  eliminar(@Param('id', ParseIntPipe) id: number) {
    return this.service.eliminarHabitacion(id);
  }

  // ── Fotos de la maqueta ──
  @Post(':id/fotos')
  @UseInterceptors(
    FileInterceptor('foto', {
      storage,
      limits: { fileSize: 10 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        if (!/\.(png|jpe?g|webp)$/i.test(file.originalname))
          return cb(new Error('Formato no admitido (PNG/JPG/WEBP)'), false);
        cb(null, true);
      },
    }),
  )
  async subirFoto(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('Sube una imagen');
    await this.imageProcessor.processMany([file.path]).catch(() => {});
    return this.service.agregarFoto(id, `/uploads/landing/${file.filename}`);
  }

  @Patch(':id/fotos/reordenar')
  reordenarFotos(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { ids: number[] },
  ) {
    return this.service.reordenarFotos(id, (body?.ids || []).map(Number));
  }

  @Delete('fotos/:fotoId')
  eliminarFoto(@Param('fotoId', ParseIntPipe) fotoId: number) {
    return this.service.eliminarFoto(fotoId);
  }
}

// ── Sedes en la web (mostrar/ocultar) ──
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Rol.SUPERADMIN, Rol.ADMIN_SEDE)
@Controller('landing-sedes')
export class LandingSedesController {
  constructor(private readonly service: LandingService) {}

  @Get()
  listar() {
    return this.service.listarSedesWeb();
  }

  @Patch(':id')
  toggle(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { webVisible: boolean },
  ) {
    return this.service.toggleSedeWeb(id, !!body?.webVisible);
  }
}
