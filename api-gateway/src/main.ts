// main.ts - API Gateway (aus VL8: Service-Gateway / API Gateway)
// Vereinfacht Clientzugriff auf alle Microservices (aus VL8: Microservice-Referenzarchitektur)
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // CORS für Angular Frontend (aus VL4: CORS & NestJS)
  // CORS fuer alle lokalen Origins (localhost, 127.0.0.1, file://)
  app.enableCors({
    origin: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`[API Gateway] läuft auf Port ${port}`);
  console.log(`Routes:`);
  console.log(`  /api/auth  -> auth-service:3001`);
  console.log(`  /api/events -> event-service:3002`);
  console.log(`  /api/orders -> order-service:3003`);
  console.log(`  /api/checkin -> checkin-service:3004`);
  console.log(`  /api/notifications -> notification-service:3005`);
}
bootstrap();
