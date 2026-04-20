import {
  Body,
  Controller,
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
import { FilesInterceptor } from '@nestjs/platform-express';
import { EstadoTareaLimpieza, Rol } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtPayload } from '../auth/auth.service';
import { LimpiezaService } from './limpieza.service';
import {
  AsignarTareaDto,
  CompletarTareaDto,
  CreateTareaDto,
  RegistrarUsoProductoDto,
} from './limpieza.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('limpieza')
export class LimpiezaController {
  constructor(private readonly service: LimpiezaService) {}

  @Get()
  findAll(
    @CurrentUser() user: JwtPayload,
    @Query('sedeId') sedeId?: string,
    @Query('estado') estado?: EstadoTareaLimpieza,
  ) {
    return this.service.findAll(
      user,
      sedeId ? Number(sedeId) : undefined,
      estado,
    );
  }

  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.findOne(id, user);
  }

  @Roles(Rol.SUPERADMIN, Rol.ADMIN_SEDE, Rol.HOTELERO)
  @Post()
  create(@Body() dto: CreateTareaDto, @CurrentUser() user: JwtPayload) {
    return this.service.create(dto, user);
  }

  @Roles(Rol.SUPERADMIN, Rol.ADMIN_SEDE, Rol.HOTELERO)
  @Patch(':id/asignar')
  asignar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AsignarTareaDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.asignar(id, dto, user);
  }

  @Roles(Rol.LIMPIEZA, Rol.ADMIN_SEDE, Rol.SUPERADMIN)
  @Patch(':id/iniciar')
  iniciar(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.iniciar(id, user);
  }

  @Roles(Rol.LIMPIEZA, Rol.ADMIN_SEDE, Rol.SUPERADMIN)
  @Post(':id/fotos')
  @UseInterceptors(FilesInterceptor('fotos', 10))
  subirFotos(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFiles() files: Express.Multer.File[],
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.subirFotos(id, files, user);
  }

  @Roles(Rol.LIMPIEZA, Rol.ADMIN_SEDE, Rol.SUPERADMIN)
  @Post(':id/uso-producto')
  registrarUso(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RegistrarUsoProductoDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.registrarUso(id, dto, user);
  }

  @Roles(Rol.LIMPIEZA, Rol.ADMIN_SEDE, Rol.SUPERADMIN)
  @Patch(':id/completar')
  completar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CompletarTareaDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.completar(id, dto, user);
  }
}
