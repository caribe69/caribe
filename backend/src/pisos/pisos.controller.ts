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
import { PisosService } from './pisos.service';
import { CreatePisoDto, UpdatePisoDto } from './piso.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('pisos')
export class PisosController {
  constructor(private readonly pisos: PisosService) {}

  @Get()
  findAll(
    @CurrentUser() user: JwtPayload,
    @Query('sedeId') sedeId?: string,
  ) {
    return this.pisos.findAll(user, sedeId ? Number(sedeId) : undefined);
  }

  @Roles(Rol.SUPERADMIN, Rol.ADMIN_SEDE)
  @Post()
  create(@Body() dto: CreatePisoDto, @CurrentUser() user: JwtPayload) {
    return this.pisos.create(dto, user);
  }

  @Roles(Rol.SUPERADMIN, Rol.ADMIN_SEDE)
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePisoDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.pisos.update(id, dto, user);
  }

  @Roles(Rol.SUPERADMIN, Rol.ADMIN_SEDE)
  @Delete(':id')
  remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.pisos.remove(id, user);
  }
}
