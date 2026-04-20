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
import { ProductosLimpiezaService } from './productos-limpieza.service';
import {
  CreateProductoLimpiezaDto,
  UpdateProductoLimpiezaDto,
  AjusteStockLimpiezaDto,
} from './producto-limpieza.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('productos-limpieza')
export class ProductosLimpiezaController {
  constructor(private readonly service: ProductosLimpiezaService) {}

  @Get()
  findAll(
    @CurrentUser() user: JwtPayload,
    @Query('sedeId') sedeId?: string,
  ) {
    return this.service.findAll(user, sedeId ? Number(sedeId) : undefined);
  }

  @Roles(Rol.SUPERADMIN, Rol.ADMIN_SEDE, Rol.LIMPIEZA)
  @Post()
  create(
    @Body() dto: CreateProductoLimpiezaDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.create(dto, user);
  }

  @Roles(Rol.SUPERADMIN, Rol.ADMIN_SEDE, Rol.LIMPIEZA)
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateProductoLimpiezaDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.update(id, dto, user);
  }

  @Roles(Rol.SUPERADMIN, Rol.ADMIN_SEDE, Rol.LIMPIEZA)
  @Post(':id/ajuste-stock')
  ajuste(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AjusteStockLimpiezaDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.ajusteStock(id, dto, user);
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
