import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ImplementosController } from './implementos.controller';
import { ImplementosService } from './implementos.service';

@Module({
  imports: [PrismaModule],
  controllers: [ImplementosController],
  providers: [ImplementosService],
  exports: [ImplementosService],
})
export class ImplementosModule {}
