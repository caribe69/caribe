import { Global, Module } from '@nestjs/common';
import { ImageProcessorService } from './image-processor.service';

/**
 * Módulo global con utilidades transversales. Se importa una sola vez en
 * AppModule y queda disponible en todos los demás módulos sin necesidad
 * de re-importarlo en cada uno.
 */
@Global()
@Module({
  providers: [ImageProcessorService],
  exports: [ImageProcessorService],
})
export class CommonModule {}
