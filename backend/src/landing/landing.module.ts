import { Module } from '@nestjs/common';
import { LandingController } from './landing.controller';
import {
  LandingHabitacionesController,
  LandingSedesController,
} from './landing-habitaciones.controller';
import { LandingService } from './landing.service';

@Module({
  controllers: [
    LandingController,
    LandingHabitacionesController,
    LandingSedesController,
  ],
  providers: [LandingService],
  exports: [LandingService],
})
export class LandingModule {}
