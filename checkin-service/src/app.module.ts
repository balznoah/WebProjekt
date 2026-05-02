import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { CheckinController } from './checkin.controller';
import { CheckinService } from './checkin.service';
import { KafkaProducer } from './kafka.producer';
import { AuthGuard } from './auth.guard';

@Module({
  imports: [
    JwtModule.register({ secret: process.env.JWT_SECRET || 'dhbw-secret-2026' }),
  ],
  controllers: [CheckinController],
  providers: [CheckinService, KafkaProducer, AuthGuard],
})
export class AppModule {}
