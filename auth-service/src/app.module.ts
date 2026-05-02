// app.module.ts - NestJS Module (aus VL4: Module & Dependency Injection)
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

@Module({
  imports: [
    // JWT aus VL4: Token-based Authentication
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'dhbw-secret-2026',
      signOptions: { expiresIn: '24h' },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AppModule {}
