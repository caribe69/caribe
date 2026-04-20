import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { mkdirSync } from 'fs';
import { LimpiezaController } from './limpieza.controller';
import { LimpiezaService } from './limpieza.service';
import { EventsModule } from '../events/events.module';

// Path absoluto relativo al cwd del proceso (PM2 lo fija en /opt/hotel/backend)
const UPLOAD_DIR = join(process.cwd(), 'uploads', 'limpieza');
try {
  mkdirSync(UPLOAD_DIR, { recursive: true });
} catch {
  /* ignore */
}

@Module({
  imports: [
    EventsModule,
    MulterModule.register({
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          try {
            mkdirSync(UPLOAD_DIR, { recursive: true });
          } catch {}
          cb(null, UPLOAD_DIR);
        },
        filename: (_req, file, cb) => {
          const unique =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, `${unique}${extname(file.originalname)}`);
        },
      }),
      limits: { fileSize: 10 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        if (!/\.(jpg|jpeg|png|webp)$/i.test(file.originalname)) {
          return cb(new Error('Solo imágenes jpg, png, webp'), false);
        }
        cb(null, true);
      },
    }),
  ],
  controllers: [LimpiezaController],
  providers: [LimpiezaService],
})
export class LimpiezaModule {}
