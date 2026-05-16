import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { NubeFactService } from './nubefact.service';
import { NubeFactController } from './nubefact.controller';
import { SunatSeriesService } from './sunat-series.service';
import { SunatSeriesController } from './sunat-series.controller';

@Module({
  imports: [PrismaModule],
  controllers: [NubeFactController, SunatSeriesController],
  providers: [NubeFactService, SunatSeriesService],
  exports: [NubeFactService, SunatSeriesService],
})
export class NubeFactModule {}
