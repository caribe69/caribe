import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { EstadoReserva, Rol, TipoReserva } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtPayload } from '../auth/auth.service';
import { ReservasService } from './reservas.service';

class CrearReservaDto {
  @IsOptional() @Type(() => Number) @IsInt() sedeId?: number;
  @Type(() => Number) @IsInt() habitacionId: number;
  @IsString() @MinLength(2) @MaxLength(120) clienteNombre: string;
  @IsOptional() @IsString() @MaxLength(15) clienteDni?: string;
  @IsOptional() @IsString() @MaxLength(20) clienteTelefono?: string;
  @IsString() inicio: string;
  @IsString() fin: string;
  @IsOptional() @IsEnum(TipoReserva) tipo?: TipoReserva;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) adelanto?: number;
  @IsOptional() @IsString() @MaxLength(300) notas?: string;
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Rol.SUPERADMIN, Rol.ADMIN_SEDE, Rol.HOTELERO, Rol.CAJERO)
@Controller('reservas')
export class ReservasController {
  constructor(private readonly service: ReservasService) {}

  @Get()
  listar(
    @CurrentUser() user: JwtPayload,
    @Query('sedeId') sedeId?: string,
    @Query('estado') estado?: EstadoReserva,
    @Query('desde') desde?: string,
    @Query('hasta') hasta?: string,
  ) {
    return this.service.listar(user, {
      sedeId: sedeId ? Number(sedeId) : undefined,
      estado,
      desde,
      hasta,
    });
  }

  @Get('estado-habitaciones')
  estadoHabitaciones(
    @CurrentUser() user: JwtPayload,
    @Query('sedeId') sedeId?: string,
  ) {
    return this.service.estadoHabitaciones(
      user,
      sedeId ? Number(sedeId) : undefined,
    );
  }

  @Get('disponibilidad')
  disponibilidad(
    @CurrentUser() user: JwtPayload,
    @Query('inicio') inicio: string,
    @Query('fin') fin: string,
    @Query('sedeId') sedeId?: string,
  ) {
    return this.service.disponibilidad(
      user,
      inicio,
      fin,
      sedeId ? Number(sedeId) : undefined,
    );
  }

  @Post()
  crear(@CurrentUser() user: JwtPayload, @Body() dto: CrearReservaDto) {
    return this.service.crear(user, dto);
  }

  @Delete(':id')
  cancelar(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.service.cancelar(user, id);
  }
}
