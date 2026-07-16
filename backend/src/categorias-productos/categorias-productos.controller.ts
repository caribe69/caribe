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
  UseGuards,
} from '@nestjs/common';
import { Rol } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtPayload } from '../auth/auth.service';
import { CategoriasProductosService } from './categorias-productos.service';
import {
  CreateCategoriaProductoDto,
  UpdateCategoriaProductoDto,
} from './categoria-producto.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('categorias-productos')
export class CategoriasProductosController {
  constructor(private readonly service: CategoriasProductosService) {}

  @Get()
  findAll(@CurrentUser() user: JwtPayload, @Query('sedeId') sedeId?: string) {
    return this.service.findAll(user, sedeId ? Number(sedeId) : undefined);
  }

  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.findOne(id, user);
  }

  @Roles(Rol.SUPERADMIN, Rol.ADMIN_SEDE)
  @Post()
  create(
    @Body() dto: CreateCategoriaProductoDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.create(dto, user);
  }

  @Roles(Rol.SUPERADMIN, Rol.ADMIN_SEDE)
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCategoriaProductoDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.update(id, dto, user);
  }

  @Roles(Rol.SUPERADMIN, Rol.ADMIN_SEDE)
  @Delete(':id')
  remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.remove(id, user);
  }
}
