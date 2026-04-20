import { Module } from '@nestjs/common';
import { AlquileresController } from './alquileres.controller';
import { AlquileresService } from './alquileres.service';

@Module({
  controllers: [AlquileresController],
  providers: [AlquileresService],
})
export class AlquileresModule {}
