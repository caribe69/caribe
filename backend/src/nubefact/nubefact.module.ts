import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { NubeFactService } from './nubefact.service';
import { NubeFactController } from './nubefact.controller';

@Module({
  imports: [PrismaModule],
  controllers: [NubeFactController],
  providers: [NubeFactService],
  exports: [NubeFactService],
})
export class NubeFactModule {}
