import { Module } from '@nestjs/common';
import { CategoriasProductosController } from './categorias-productos.controller';
import { CategoriasProductosService } from './categorias-productos.service';

@Module({
  controllers: [CategoriasProductosController],
  providers: [CategoriasProductosService],
  exports: [CategoriasProductosService],
})
export class CategoriasProductosModule {}
