// gateway.service.ts - HTTP-Proxy zu den Microservices
// API Gateway routet Requests an Services (aus VL8: Service Routing)
import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import fetch from 'node-fetch';

@Injectable()
export class GatewayService {
  private readonly logger = new Logger(GatewayService.name);

  private serviceUrls = {
    auth: process.env.AUTH_SERVICE_URL || 'http://localhost:3001',
    events: process.env.EVENT_SERVICE_URL || 'http://localhost:3002',
    orders: process.env.ORDER_SERVICE_URL || 'http://localhost:3003',
    checkin: process.env.CHECKIN_SERVICE_URL || 'http://localhost:3004',
    notifications: process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3005',
  };

  async proxy(
    service: keyof typeof this.serviceUrls,
    path: string,
    method: string,
    headers: Record<string, string>,
    body?: any,
  ): Promise<any> {
    const url = `${this.serviceUrls[service]}${path}`;
    this.logger.log(`[Gateway] ${method} ${url}`);

    const options: any = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(headers.authorization ? { authorization: headers.authorization } : {}),
      },
    };

    if (body && method !== 'GET') {
      options.body = JSON.stringify(body);
    }

    try {
      const res = await fetch(url, options);
      const data = await res.json();
      if (!res.ok) {
        throw new HttpException(data, res.status);
      }
      return data;
    } catch (err: any) {
      if (err instanceof HttpException) throw err;
      this.logger.error(`Service ${service} nicht erreichbar: ${err.message}`);
      throw new HttpException(`Service temporär nicht verfügbar`, HttpStatus.SERVICE_UNAVAILABLE);
    }
  }
}
