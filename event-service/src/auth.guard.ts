// auth.guard.ts - JWT Middleware (aus VL4: JWT & NestJS Middleware)
import {
  Injectable, CanActivate, ExecutionContext,
  UnauthorizedException, ForbiddenException
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers['authorization'];

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Kein JWT Token vorhanden');
    }

    const token = authHeader.split(' ')[1];
    try {
      const payload = this.jwtService.verify(token, {
        secret: process.env.JWT_SECRET || 'dhbw-secret-2026',
      });
      request.user = payload; // User in Request speichern
      return true;
    } catch {
      throw new UnauthorizedException('Token ungültig oder abgelaufen');
    }
  }
}

// Rolle prüfen (aus VL4: Autorisierung)
@Injectable()
export class RoleGuard implements CanActivate {
  constructor(private allowedRoles: string[]) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (!user || !this.allowedRoles.includes(user.role)) {
      throw new ForbiddenException('Nicht autorisiert für diese Aktion');
    }
    return true;
  }
}
