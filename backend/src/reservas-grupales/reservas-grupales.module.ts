import { Module } from '@nestjs/common';
import { ReservasGrupalesController } from './reservas-grupales.controller';
import { ReservasGrupalesService } from './reservas-grupales.service';

@Module({
  controllers: [ReservasGrupalesController],
  providers: [ReservasGrupalesService],
})
export class ReservasGrupalesModule {}
