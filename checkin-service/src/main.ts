import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({ origin: '*', methods: ['GET','POST','PUT','DELETE','OPTIONS'], allowedHeaders: ['Content-Type','Authorization'] });
  const port = process.env.PORT || 3004;
  await app.listen(port);
  console.log(`[Check-in Service] läuft auf Port ${port}`);
}
bootstrap();
