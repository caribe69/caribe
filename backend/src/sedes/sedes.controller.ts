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
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { Rol } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { SedesService } from './sedes.service';
import { CreateSedeDto, UpdateSedeDto } from './sede.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('sedes')
export class SedesController {
  constructor(private readonly sedes: SedesService) {}

  @Get()
  findAll() {
    return this.sedes.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.sedes.findOne(id);
  }

  @Roles(Rol.SUPERADMIN)
  @Post()
  create(@Body() dto: CreateSedeDto) {
    return this.sedes.create(dto);
  }

  @Roles(Rol.SUPERADMIN)
  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateSedeDto) {
    return this.sedes.update(id, dto);
  }

  @Roles(Rol.SUPERADMIN)
  @Patch(':id/toggle')
  toggle(@Param('id', ParseIntPipe) id: number) {
    return this.sedes.toggleActiva(id);
  }

  @Roles(Rol.SUPERADMIN)
  @Patch(':id/principal')
  setPrincipal(@Param('id', ParseIntPipe) id: number) {
    return this.sedes.setPrincipal(id);
  }

  // ─── Fotos ───
  @Get(':id/fotos')
  listarFotos(@Param('id', ParseIntPipe) id: number) {
    return this.sedes.listarFotos(id);
  }

  @Roles(Rol.SUPERADMIN, Rol.ADMIN_SEDE)
  @Post(':id/fotos')
  @UseInterceptors(FilesInterceptor('fotos', 10))
  async subirFotos(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException('Subí al menos una foto');
    }
    return this.sedes.subirFotos(id, files);
  }

  @Roles(Rol.SUPERADMIN, Rol.ADMIN_SEDE)
  @Delete(':id/fotos/:fotoId')
  eliminarFoto(
    @Param('id', ParseIntPipe) id: number,
    @Param('fotoId', ParseIntPipe) fotoId: number,
  ) {
    return this.sedes.eliminarFoto(id, fotoId);
  }
}
