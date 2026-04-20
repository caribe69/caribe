import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({ origin: true, credentials: true });
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      // Dejamos que properties desconocidas se descarten silenciosamente
      // (el frontend puede inyectar sedeId en body aunque el DTO no lo use).
      forbidNonWhitelisted: false,
    }),
  );
  const port = process.env.PORT || 3001;
  await app.listen(port);
  console.log(`Backend corriendo en http://localhost:${port}/api`);
}
bootstrap();
