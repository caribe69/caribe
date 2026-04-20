import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { IsOptional, IsString, MinLength } from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtPayload } from '../auth/auth.service';
import { AnulacionesService } from './anulaciones.service';

class SolicitarDto {
  @IsString() @MinLength(3) motivo: string;
}
class RespuestaDto {
  @IsOptional() @IsString() respuesta?: string;
}

@UseGuards(JwtAuthGuard)
@Controller('anulaciones')
export class AnulacionesController {
  constructor(private readonly service: AnulacionesService) {}

  @Post('alquileres/:id')
  solicitar(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SolicitarDto,
  ) {
    return this.service.solicitar(user, id, dto.motivo);
  }

  @Get()
  listar(
    @CurrentUser() user: JwtPayload,
    @Query('estado') estado?: string,
    @Query('sedeId') sedeId?: string,
  ) {
    return this.service.listar(
      user,
      sedeId ? Number(sedeId) : undefined,
      estado,
    );
  }

  @Patch(':id/aprobar')
  aprobar(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RespuestaDto,
  ) {
    return this.service.aprobar(user, id, dto.respuesta);
  }

  @Patch(':id/rechazar')
  rechazar(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RespuestaDto,
  ) {
    return this.service.rechazar(user, id, dto.respuesta);
  }
}
