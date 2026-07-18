import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { IsBoolean, IsInt, IsOptional, IsString, MinLength } from 'class-validator';
import { Type } from 'class-transformer';
import { Rol } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { NubeFactService } from './nubefact.service';

class EmitirDto {
  @IsOptional() @IsBoolean() forzar?: boolean;
  @IsOptional() @Type(() => Number) @IsInt() numero?: number;
}

class AnularDto {
  @IsInt() @Type(() => Number) tipo!: 1 | 2 | 3 | 4;
  @IsString() serie!: string;
  @IsInt() @Type(() => Number) numero!: number;
  @IsString() @MinLength(3) motivo!: string;
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Rol.SUPERADMIN, Rol.ADMIN_SEDE)
@Controller('nubefact')
export class NubeFactController {
  constructor(private readonly service: NubeFactService) {}

  /** Estado de la configuración (sin exponer token). */
  @Get('status')
  status() {
    return this.service.getStatus();
  }

  /** Test de conexión real al endpoint. */
  @Post('test')
  async test() {
    return this.service.testConexion();
  }

  /** Próximo correlativo para una serie. */
  @Get('proximo-numero')
  proximoNumero(@Query('serie') serie: string) {
    if (!serie) throw new BadRequestException('serie requerida');
    return this.service.proximoNumero(serie).then((n) => ({ serie, numero: n }));
  }

  /** Emitir comprobante a partir de un alquiler existente. */
  @Roles(Rol.SUPERADMIN, Rol.ADMIN_SEDE, Rol.HOTELERO, Rol.CAJERO)
  @Post('alquileres/:id/emitir')
  emitirAlquiler(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: EmitirDto,
  ) {
    return this.service.emitirDesdeAlquiler(id, {
      forzar: dto.forzar,
      numeroOverride: dto.numero,
    });
  }

  /** Emitir boleta a partir de una venta directa. */
  @Roles(Rol.SUPERADMIN, Rol.ADMIN_SEDE, Rol.HOTELERO, Rol.CAJERO)
  @Post('ventas/:id/emitir')
  emitirVenta(@Param('id', ParseIntPipe) id: number, @Body() dto: EmitirDto) {
    return this.service.emitirDesdeVenta(id, {
      forzar: dto.forzar,
      numeroOverride: dto.numero,
    });
  }

  /** Emitir FACTURA CONSOLIDADA de una reserva grupal (1 factura, N líneas). */
  @Post('reservas-grupales/:id/emitir')
  emitirReservaGrupal(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: EmitirDto,
  ) {
    return this.service.emitirDesdeReservaGrupal(id, {
      forzar: dto.forzar,
      numeroOverride: dto.numero,
    });
  }

  /** Consultar el estado de un comprobante en SUNAT. */
  @Get('consultar')
  consultar(
    @Query('tipo') tipoStr: string,
    @Query('serie') serie: string,
    @Query('numero') numeroStr: string,
  ) {
    if (!tipoStr || !serie || !numeroStr)
      throw new BadRequestException('Se requiere tipo, serie y numero');
    return this.service.consultarComprobante(
      Number(tipoStr) as any,
      serie,
      Number(numeroStr),
    );
  }

  /** Anular (comunicación de baja). */
  @Post('anular')
  anular(@Body() dto: AnularDto) {
    return this.service.anularComprobante(
      dto.tipo,
      dto.serie,
      dto.numero,
      dto.motivo,
    );
  }

  /** Consultar el estado de una anulación. */
  @Get('consultar-anulacion')
  consultarAnulacion(
    @Query('tipo') tipoStr: string,
    @Query('serie') serie: string,
    @Query('numero') numeroStr: string,
  ) {
    return this.service.consultarAnulacion(
      Number(tipoStr) as any,
      serie,
      Number(numeroStr),
    );
  }
}
