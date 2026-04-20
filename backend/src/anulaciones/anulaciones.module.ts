import { Module } from '@nestjs/common';
import { AnulacionesController } from './anulaciones.controller';
import { AnulacionesService } from './anulaciones.service';
import { ChatModule } from '../chat/chat.module';

@Module({
  imports: [ChatModule],
  controllers: [AnulacionesController],
  providers: [AnulacionesService],
})
export class AnulacionesModule {}
