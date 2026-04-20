import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Rol } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtPayload } from '../auth/auth.service';
import { UsuariosService } from './usuarios.service';
import { CreateUsuarioDto, UpdateUsuarioDto } from './usuario.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Rol.SUPERADMIN, Rol.ADMIN_SEDE)
@Controller('usuarios')
export class UsuariosController {
  constructor(private readonly usuarios: UsuariosService) {}

  @Get()
  findAll(@CurrentUser() user: JwtPayload) {
    return this.usuarios.findAll(user);
  }

  @Post()
  create(@Body() dto: CreateUsuarioDto, @CurrentUser() user: JwtPayload) {
    return this.usuarios.create(dto, user);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUsuarioDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.usuarios.update(id, dto, user);
  }
}
