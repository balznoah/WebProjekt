// auth.service.ts - Business Logik (aus VL4: Services)
// Authentifizierung & Autorisierung (aus VL4: OAuth2, JWT)
import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';

// Rollen aus der Aufgabe: Admin / Visitor / Staff
export type UserRole = 'admin' | 'visitor' | 'staff';

export interface User {
  id: number;
  username: string;
  email: string;
  passwordHash: string;
  role: UserRole;
}

export interface TokenPayload {
  sub: number;       // JWT sub claim (aus VL4: JWT Ausdrücke)
  username: string;
  email: string;
  role: UserRole;
  iss: string;       // Issuer
  aud: string;       // Audience
}

@Injectable()
export class AuthService {
  // In-Memory Speicher (aus VL4: Services mit Map)
  private users: Map<number, User> = new Map();
  private nextId = 1;

  constructor(private jwtService: JwtService) {
    // Demo-Nutzer voranlegen
    this.seedUsers();
  }

  private async seedUsers() {
    await this.register('admin@dhbw.de', 'admin', 'admin123', 'admin');
    await this.register('staff@dhbw.de', 'staff1', 'staff123', 'staff');
    await this.register('visitor@dhbw.de', 'visitor1', 'visitor123', 'visitor');
  }

  async register(email: string, username: string, password: string, role: UserRole = 'visitor'): Promise<User> {
    // Prüfen ob E-Mail bereits existiert
    const existing = Array.from(this.users.values()).find(u => u.email === email);
    if (existing) {
      throw new ConflictException('E-Mail bereits vergeben');
    }

    // Passwort hashen (bcrypt aus VL4)
    const passwordHash = await bcrypt.hash(password, 10);
    const user: User = {
      id: this.nextId++,
      username,
      email,
      passwordHash,
      role,
    };
    this.users.set(user.id, user);
    return user;
  }

  async login(email: string, password: string): Promise<{ access_token: string; user: Omit<User, 'passwordHash'> }> {
    const user = Array.from(this.users.values()).find(u => u.email === email);
    if (!user) {
      throw new UnauthorizedException('Ungültige Anmeldedaten');
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Ungültige Anmeldedaten');
    }

    // JWT Token erstellen (aus VL4: JWT Claims)
    const payload: TokenPayload = {
      sub: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      iss: 'smart-ticketing-auth',
      aud: 'smart-ticketing-app',
    };

    const access_token = this.jwtService.sign(payload);
    const { passwordHash, ...safeUser } = user;
    return { access_token, user: safeUser };
  }

  async validateToken(token: string): Promise<TokenPayload> {
    try {
      return this.jwtService.verify<TokenPayload>(token);
    } catch {
      throw new UnauthorizedException('Token ungültig oder abgelaufen');
    }
  }

  getUsers(): Omit<User, 'passwordHash'>[] {
    return Array.from(this.users.values()).map(({ passwordHash, ...u }) => u);
  }
}
