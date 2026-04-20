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
}
