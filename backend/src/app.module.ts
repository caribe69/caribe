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
import { CategoriasProductosModule } from './categorias-productos/categorias-productos.module';
import { ProductosLimpiezaModule } from './productos-limpieza/productos-limpieza.module';
import { AlquileresModule } from './alquileres/alquileres.module';
import { LimpiezaModule } from './limpieza/limpieza.module';
import { CajaModule } from './caja/caja.module';
import { VentasModule } from './ventas/ventas.module';
import { EventsModule } from './events/events.module';
import { ChatModule } from './chat/chat.module';
import { AnulacionesModule } from './anulaciones/anulaciones.module';
import { SettingsModule } from './settings/settings.module';
import { ReportesModule } from './reportes/reportes.module';
import { TransferenciasModule } from './transferencias/transferencias.module';
import { ReservasGrupalesModule } from './reservas-grupales/reservas-grupales.module';
import { PublicModule } from './public/public.module';
import { LandingModule } from './landing/landing.module';
import { AuditModule } from './audit/audit.module';
import { DocumentosModule } from './documentos/documentos.module';
import { PersonalModule } from './personal/personal.module';
import { NubeFactModule } from './nubefact/nubefact.module';
import { ImplementosModule } from './implementos/implementos.module';
import { CommonModule } from './common/common.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    CommonModule,
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'uploads'),
      serveRoot: '/uploads',
      serveStaticOptions: {
        index: false,
        fallthrough: true,
      },
    }),
    PrismaModule,
    EventsModule,
    AuthModule,
    SedesModule,
    UsuariosModule,
    PisosModule,
    HabitacionesModule,
    ProductosModule,
    CategoriasProductosModule,
    ProductosLimpiezaModule,
    AlquileresModule,
    LimpiezaModule,
    CajaModule,
    VentasModule,
    ChatModule,
    AnulacionesModule,
    SettingsModule,
    ReportesModule,
    TransferenciasModule,
    ReservasGrupalesModule,
    PublicModule,
    LandingModule,
    AuditModule,
    DocumentosModule,
    PersonalModule,
    NubeFactModule,
    ImplementosModule,
  ],
})
export class AppModule {}

