import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { mkdirSync } from 'fs';
import { HabitacionesController } from './habitaciones.controller';
import { HabitacionesService } from './habitaciones.service';

const UPLOAD_DIR = join(process.cwd(), 'uploads', 'habitaciones');
try {
  mkdirSync(UPLOAD_DIR, { recursive: true });
} catch {
  /* ignore */
}

@Module({
  imports: [
    MulterModule.register({
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          try {
            mkdirSync(UPLOAD_DIR, { recursive: true });
          } catch {}
          cb(null, UPLOAD_DIR);
        },
        filename: (_req, file, cb) => {
          const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
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
  controllers: [HabitacionesController],
  providers: [HabitacionesService],
  exports: [HabitacionesService],
})
export class HabitacionesModule {}
