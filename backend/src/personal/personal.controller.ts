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
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { mkdirSync } from 'fs';
import {
  IsDateString,
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MinLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { Rol } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtPayload } from '../auth/auth.service';
import { PersonalService } from './personal.service';
import { ImageProcessorService } from '../common/image-processor.service';

const DIR = join(process.cwd(), 'uploads', 'personal');
try {
  mkdirSync(DIR, { recursive: true });
} catch {}

const fotoFileFilter = (_req: any, file: any, cb: any) => {
  if (!/\.(png|jpe?g|webp)$/i.test(file.originalname))
    return cb(new Error('Formato de foto no admitido (PNG/JPG/WEBP)'), false);
  cb(null, true);
};
const fotoStorage = diskStorage({
  destination: (_req, _file, cb) => {
    try {
      mkdirSync(DIR, { recursive: true });
    } catch {}
    cb(null, DIR);
  },
  filename: (_req, file, cb) => {
    cb(null, `p_${Date.now()}_${Math.random().toString(36).slice(2, 8)}${extname(file.originalname)}`);
  },
});

class CrearPersonalDto {
  @IsString() @Matches(/^[0-9]{8,11}$/, { message: 'DNI inválido' })
  dni!: string;
  @IsString() nombre!: string;
  @IsString() apellidoPaterno!: string;
  @IsOptional() @IsString() apellidoMaterno?: string;
  @IsOptional() @IsDateString() fechaNacimiento?: string;
  @IsOptional() @IsDateString() fechaIngreso?: string;
  @IsOptional() @IsEmail() correo?: string;
  @IsOptional() @IsString() telefono?: string;
  @IsOptional() @IsString() direccion?: string;
  @IsOptional() @IsString() cargo?: string;
  @IsOptional() @IsString() notas?: string;
  @IsOptional() @Type(() => Number) @IsInt() sedeId?: number;
}

class UpdatePersonalDto {
  @IsOptional() @IsString() nombre?: string;
  @IsOptional() @IsString() apellidoPaterno?: string;
  @IsOptional() @IsString() apellidoMaterno?: string;
  @IsOptional() @IsDateString() fechaNacimiento?: string;
  @IsOptional() @IsDateString() fechaIngreso?: string;
  @IsOptional() @IsEmail() correo?: string;
  @IsOptional() @IsString() telefono?: string;
  @IsOptional() @IsString() direccion?: string;
  @IsOptional() @IsString() cargo?: string;
  @IsOptional() @IsString() notas?: string;
  @IsOptional() @Type(() => Number) @IsInt() sedeId?: number;
}

class CrearUsuarioDto {
  @IsOptional() @IsString() username?: string;
  @IsString() @MinLength(6) password!: string;
  @IsEnum(Rol) rol!: Rol;
}

class TransferirDto {
  @Type(() => Number) @IsInt() @Min(1) haciaSedeId!: number;
  @IsString() @MinLength(3) motivo!: string;
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('personal')
export class PersonalController {
  constructor(
    private readonly service: PersonalService,
    private readonly imageProcessor: ImageProcessorService,
  ) {}

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

  @Get(':id')
  detalle(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Roles(Rol.SUPERADMIN, Rol.ADMIN_SEDE)
  @Post()
  crear(@Body() dto: CrearPersonalDto, @CurrentUser() user: JwtPayload) {
    return this.service.crear(
      {
        ...dto,
        fechaNacimiento: dto.fechaNacimiento
          ? new Date(dto.fechaNacimiento)
          : null,
        fechaIngreso: dto.fechaIngreso ? new Date(dto.fechaIngreso) : null,
      } as any,
      user,
    );
  }

  @Roles(Rol.SUPERADMIN, Rol.ADMIN_SEDE)
  @Patch(':id')
  actualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePersonalDto,
  ) {
    return this.service.actualizar(id, {
      ...dto,
      fechaNacimiento: dto.fechaNacimiento
        ? new Date(dto.fechaNacimiento)
        : undefined,
      fechaIngreso: dto.fechaIngreso ? new Date(dto.fechaIngreso) : undefined,
    } as any);
  }

  @Roles(Rol.SUPERADMIN, Rol.ADMIN_SEDE)
  @Delete(':id')
  eliminar(@Param('id', ParseIntPipe) id: number) {
    return this.service.eliminar(id);
  }

  /** Sube hasta 3 fotos (perfil, dni frente, dni reverso) */
  @Roles(Rol.SUPERADMIN, Rol.ADMIN_SEDE)
  @Post(':id/fotos')
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'fotoPerfil', maxCount: 1 },
        { name: 'fotoDniFrente', maxCount: 1 },
        { name: 'fotoDniReverso', maxCount: 1 },
      ],
      {
        storage: fotoStorage,
        limits: { fileSize: 8 * 1024 * 1024 },
        fileFilter: fotoFileFilter,
      },
    ),
  )
  async subirFotos(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFiles()
    files: {
      fotoPerfil?: Express.Multer.File[];
      fotoDniFrente?: Express.Multer.File[];
      fotoDniReverso?: Express.Multer.File[];
    },
  ) {
    if (!files || Object.keys(files).length === 0)
      throw new BadRequestException('Sube al menos una foto');
    const paths: any = {};
    const filesToProcess: string[] = [];
    if (files.fotoPerfil?.[0]) {
      paths.fotoPerfil = `/uploads/personal/${files.fotoPerfil[0].filename}`;
      filesToProcess.push(files.fotoPerfil[0].path);
    }
    if (files.fotoDniFrente?.[0]) {
      paths.fotoDniFrente = `/uploads/personal/${files.fotoDniFrente[0].filename}`;
      filesToProcess.push(files.fotoDniFrente[0].path);
    }
    if (files.fotoDniReverso?.[0]) {
      paths.fotoDniReverso = `/uploads/personal/${files.fotoDniReverso[0].filename}`;
      filesToProcess.push(files.fotoDniReverso[0].path);
    }
    // Optimiza imágenes y genera thumbnails en paralelo (no bloquea
    // si alguna falla — queda el original sin tocar).
    await this.imageProcessor.processMany(filesToProcess);
    return this.service.actualizarFotos(id, paths);
  }

  /** Crea usuario del sistema y lo vincula */
  @Roles(Rol.SUPERADMIN, Rol.ADMIN_SEDE)
  @Post(':id/crear-usuario')
  crearUsuario(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CrearUsuarioDto,
  ) {
    return this.service.crearUsuario(id, dto);
  }

  @Roles(Rol.SUPERADMIN, Rol.ADMIN_SEDE)
  @Delete(':id/usuario')
  desvincularUsuario(@Param('id', ParseIntPipe) id: number) {
    return this.service.desvincularUsuario(id);
  }

  /** Busca un usuario existente que coincida con el personal (email o DNI). */
  @Roles(Rol.SUPERADMIN, Rol.ADMIN_SEDE)
  @Get(':id/usuario-existente')
  usuarioExistente(@Param('id', ParseIntPipe) id: number) {
    return this.service.usuarioExistenteParaPersonal(id);
  }

  /** Vincula un usuario ya creado (no crea uno nuevo). */
  @Roles(Rol.SUPERADMIN, Rol.ADMIN_SEDE)
  @Post(':id/vincular-usuario')
  vincularUsuario(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { usuarioId: number },
  ) {
    return this.service.vincularUsuarioExistente(id, Number(body.usuarioId));
  }

  /** Transferir personal a otra sede (SUPERADMIN o ADMIN_SEDE de origen/destino). */
  @Roles(Rol.SUPERADMIN, Rol.ADMIN_SEDE)
  @Post(':id/transferir')
  transferir(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: TransferirDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.transferir(id, dto, user);
  }

  /**
   * Historial completo del personal: lista de transferencias entre sedes
   * + métricas agregadas por sede (ventas, alquileres, turnos cerrados).
   * Visible para SUPERADMIN y ADMIN_SEDE que tenga al personal en su sede
   * actual o que haya sido origen/destino de alguna transferencia.
   */
  @Roles(Rol.SUPERADMIN, Rol.ADMIN_SEDE)
  @Get(':id/historial-completo')
  historialCompleto(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.historialCompleto(id, user);
  }
}
