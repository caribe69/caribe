import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { SedesModule } from './sedes/sedes.module';
import { UsuariosModule } from './usuarios/usuarios.module';
import { PisosModule } from './pisos/pisos.module';
import { HabitacionesModule } from './habitaciones/habitaciones.module';
import { ProductosModule } from './productos/productos.module';
import { ProductosLimpiezaModule } from './productos-limpieza/productos-limpieza.module';
import { AlquileresModule } from './alquileres/alquileres.module';
import { LimpiezaModule } from './limpieza/limpieza.module';
import { CajaModule } from './caja/caja.module';
import { VentasModule } from './ventas/ventas.module';
import { EventsModule } from './events/events.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'uploads'),
      serveRoot: '/uploads',
    }),
    PrismaModule,
    EventsModule,
    AuthModule,
    SedesModule,
    UsuariosModule,
    PisosModule,
    HabitacionesModule,
    ProductosModule,
    ProductosLimpiezaModule,
    AlquileresModule,
    LimpiezaModule,
    CajaModule,
    VentasModule,
  ],
})
export class AppModule {}
