import {
  Controller,
  Get,
  ParseIntPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Rol } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { AuditService } from './audit.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Rol.SUPERADMIN)
@Controller('audit')
export class AuditController {
  constructor(private readonly service: AuditService) {}

  @Get()
  listar(
    @Query('desde') desde?: string,
    @Query('hasta') hasta?: string,
    @Query('usuarioId') usuarioIdStr?: string,
    @Query('accion') accion?: string,
    @Query('recurso') recurso?: string,
    @Query('ok') okStr?: string,
    @Query('q') q?: string,
    @Query('page') pageStr?: string,
    @Query('size') sizeStr?: string,
  ) {
    return this.service.listar({
      desde: desde ? new Date(desde) : undefined,
      hasta: hasta ? new Date(hasta) : undefined,
      usuarioId: usuarioIdStr ? Number(usuarioIdStr) : undefined,
      accion: accion || undefined,
      recurso: recurso || undefined,
      ok: okStr === undefined ? undefined : okStr === 'true',
      q: q || undefined,
      page: pageStr ? Number(pageStr) : 1,
      size: sizeStr ? Number(sizeStr) : 30,
    });
  }

  @Get('facets')
  facets() {
    return this.service.facets();
  }
}
