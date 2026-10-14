import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { logger: ['log', 'warn', 'error'] });
  app.setGlobalPrefix('api');
  app.enableShutdownHooks();
  const origin = process.env.WEB_ORIGIN?.split(',') ?? ['http://localhost:3000'];
  app.enableCors({ origin, credentials: true });
  const port = Number(process.env.PORT ?? 4000);
  await app.listen(port, '0.0.0.0');
  console.log(`Dembel Hub API listening on :${port}`);
}
bootstrap();
