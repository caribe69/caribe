import { Controller, Get } from '@nestjs/common';
import { PublicService } from './public.service';

// SIN guards — endpoints accesibles por la landing pública sin token
@Controller('public')
export class PublicController {
  constructor(private readonly service: PublicService) {}

  @Get('landing')
  landing() {
    return this.service.landing();
  }

  /** Lista de sedes operativas para el selector del login (sin token). */
  @Get('sedes')
  sedes() {
    return this.service.sedesLogin();
  }
}
