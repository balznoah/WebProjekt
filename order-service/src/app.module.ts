import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { OrderController } from './order.controller';
import { OrderService } from './order.service';
import { KafkaProducer } from './kafka.producer';
import { AuthGuard } from './auth.guard';

@Module({
  imports: [
    JwtModule.register({ secret: process.env.JWT_SECRET || 'dhbw-secret-2026' }),
  ],
  controllers: [OrderController],
  providers: [OrderService, KafkaProducer, AuthGuard],
})
export class AppModule {}
