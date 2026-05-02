import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { EventController } from './event.controller';
import { EventService } from './event.service';
import { AuthGuard } from './auth.guard';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'dhbw-secret-2026',
    }),
  ],
  controllers: [EventController],
  providers: [EventService, AuthGuard],
})
export class AppModule {}
