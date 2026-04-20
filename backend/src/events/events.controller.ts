import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { Rol } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtPayload } from '../auth/auth.service';
import { EventsGateway } from './events.gateway';

class TestEventDto {
  sedeId?: number;
  event?: string;
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('events')
export class EventsController {
  constructor(private readonly gw: EventsGateway) {}

  /**
   * Emite un evento de prueba.
   * curl -X POST http://localhost:3001/api/events/test \
   *   -H "Authorization: Bearer <token>" \
   *   -H "Content-Type: application/json" \
   *   -d '{"sedeId": 1}'
   */
  @Roles(Rol.SUPERADMIN, Rol.ADMIN_SEDE, Rol.HOTELERO, Rol.LIMPIEZA, Rol.CAJERO)
  @Post('test')
  testEmit(@Body() body: TestEventDto, @CurrentUser() user: JwtPayload) {
    const sedeId = body.sedeId || user.sedeId || 1;
    const event = body.event || 'limpieza:iniciada';

    const payload = {
      tareaId: 0,
      habitacionNumero: 'TEST',
      porUsuario: `🧪 TEST desde ${user.username}`,
      cantidadFotos: 1,
      totalFotos: 1,
    };

    this.gw.emitToSede(sedeId, event, payload);

    return {
      ok: true,
      emitted: event,
      toSede: sedeId,
      payload,
      message: `Evento ${event} emitido a sede:${sedeId} + superadmin`,
    };
  }
}
