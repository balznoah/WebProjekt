// auth.controller.ts - Controller (aus VL4: NestJS Controller & Routing)
import {
  Controller, Post, Get, Body, Headers,
  HttpCode, HttpStatus, UnauthorizedException
} from '@nestjs/common';
import { AuthService, UserRole } from './auth.service';

// DTOs (Data Transfer Objects)
interface RegisterDto {
  email: string;
  username: string;
  password: string;
  role?: UserRole;
}

interface LoginDto {
  email: string;
  password: string;
}

// Controller-Decorator: Routen (aus VL4: NestJS Routing)
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  // POST /auth/register - Neuen Nutzer registrieren
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() dto: RegisterDto) {
    const user = await this.authService.register(
      dto.email,
      dto.username,
      dto.password,
      dto.role || 'visitor',
    );
    const { passwordHash, ...safe } = user as any;
    return { message: 'Registrierung erfolgreich', user: safe };
  }

  // POST /auth/login - Login und JWT-Token erhalten
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto.email, dto.password);
  }

  // POST /auth/validate - Token validieren (wird vom API-Gateway genutzt)
  @Post('validate')
  @HttpCode(HttpStatus.OK)
  async validate(@Headers('authorization') authHeader: string) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Kein Token vorhanden');
    }
    const token = authHeader.split(' ')[1];
    const payload = await this.authService.validateToken(token);
    return { valid: true, user: payload };
  }

  // GET /auth/users - Alle Nutzer (nur für Admin, vereinfacht)
  @Get('users')
  getUsers() {
    return this.authService.getUsers();
  }

  // GET /auth/health - Health Check (aus VL8: Health Checker)
  @Get('health')
  health() {
    return { status: 'ok', service: 'auth-service' };
  }
}
