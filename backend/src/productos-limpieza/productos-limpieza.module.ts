import { Module } from '@nestjs/common';
import { ProductosLimpiezaController } from './productos-limpieza.controller';
import { ProductosLimpiezaService } from './productos-limpieza.service';

@Module({
  controllers: [ProductosLimpiezaController],
  providers: [ProductosLimpiezaService],
  exports: [ProductosLimpiezaService],
})
export class ProductosLimpiezaModule {}
