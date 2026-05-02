// gateway.controller.ts - Alle API-Routen (aus VL8: API-Gateway Konzept)
import {
  Controller, Get, Post, Put, Delete,
  Param, Body, Headers, HttpCode, HttpStatus
} from '@nestjs/common';
import { GatewayService } from './gateway.service';

@Controller('api')
export class GatewayController {
  constructor(private gatewayService: GatewayService) {}

  // ─── Auth Service ─────────────────────────────────────────────────────
  @Post('auth/register')
  authRegister(@Body() body: any) {
    return this.gatewayService.proxy('auth', '/auth/register', 'POST', {}, body);
  }
  @Post('auth/login')
  authLogin(@Body() body: any) {
    return this.gatewayService.proxy('auth', '/auth/login', 'POST', {}, body);
  }
  @Post('auth/validate')
  authValidate(@Headers() headers: any) {
    return this.gatewayService.proxy('auth', '/auth/validate', 'POST', headers);
  }
  @Get('auth/users')
  authUsers(@Headers() headers: any) {
    return this.gatewayService.proxy('auth', '/auth/users', 'GET', headers);
  }

  // ─── Event Service ────────────────────────────────────────────────────
  @Get('events')
  getEvents() {
    return this.gatewayService.proxy('events', '/events', 'GET', {});
  }
  @Get('events/:id')
  getEvent(@Param('id') id: string) {
    return this.gatewayService.proxy('events', `/events/${id}`, 'GET', {});
  }
  @Post('events')
  createEvent(@Body() body: any, @Headers() headers: any) {
    return this.gatewayService.proxy('events', '/events', 'POST', headers, body);
  }
  @Put('events/:id')
  updateEvent(@Param('id') id: string, @Body() body: any, @Headers() headers: any) {
    return this.gatewayService.proxy('events', `/events/${id}`, 'PUT', headers, body);
  }
  @Delete('events/:id')
  deleteEvent(@Param('id') id: string, @Headers() headers: any) {
    return this.gatewayService.proxy('events', `/events/${id}`, 'DELETE', headers);
  }

  // ─── Order Service ────────────────────────────────────────────────────
  @Post('orders')
  @HttpCode(HttpStatus.CREATED)
  createOrder(@Body() body: any, @Headers() headers: any) {
    return this.gatewayService.proxy('orders', '/orders', 'POST', headers, body);
  }
  @Get('orders/my')
  getMyOrders(@Headers() headers: any) {
    return this.gatewayService.proxy('orders', '/orders/my', 'GET', headers);
  }
  @Get('orders')
  getAllOrders(@Headers() headers: any) {
    return this.gatewayService.proxy('orders', '/orders', 'GET', headers);
  }
  @Get('orders/:id')
  getOrder(@Param('id') id: string, @Headers() headers: any) {
    return this.gatewayService.proxy('orders', `/orders/${id}`, 'GET', headers);
  }
  @Post('orders/:id/pay')
  payOrder(@Param('id') id: string, @Headers() headers: any) {
    return this.gatewayService.proxy('orders', `/orders/${id}/pay`, 'POST', headers);
  }
  @Post('orders/validate-qr')
  validateQr(@Body() body: any) {
    return this.gatewayService.proxy('orders', '/orders/validate-qr', 'POST', {}, body);
  }

  // ─── Check-in Service ─────────────────────────────────────────────────
  @Post('checkin')
  checkin(@Body() body: any, @Headers() headers: any) {
    return this.gatewayService.proxy('checkin', '/checkin', 'POST', headers, body);
  }
  @Get('checkin')
  getCheckins(@Headers() headers: any) {
    return this.gatewayService.proxy('checkin', '/checkin', 'GET', headers);
  }
  @Get('checkin/stats')
  getCheckinStats(@Headers() headers: any) {
    return this.gatewayService.proxy('checkin', '/checkin/stats', 'GET', headers);
  }

  // ─── Notification Service ─────────────────────────────────────────────
  @Get('notifications')
  getNotifications(@Headers() headers: any) {
    return this.gatewayService.proxy('notifications', '/notifications', 'GET', headers);
  }

  // ─── Health Check (aus VL8: Health Checker) ───────────────────────────
  @Get('health')
  async health() {
    const checks: Record<string, string> = {};
    const tests: [string, string, string][] = [
      ['auth', '/auth/health', 'auth'],
      ['events', '/events/health/check', 'events'],
      ['orders', '/orders/health/check', 'orders'],
      ['checkin', '/checkin/health', 'checkin'],
      ['notifications', '/notifications/health', 'notifications'],
    ];
    for (const [label, path, svc] of tests) {
      try {
        await this.gatewayService.proxy(svc as any, path, 'GET', {});
        checks[label] = 'ok';
      } catch { checks[label] = 'unavailable'; }
    }
    return { gateway: 'ok', services: checks, timestamp: new Date().toISOString() };
  }
}
