// order.controller.ts - REST-Endpunkte für Bestellungen (aus VL4: NestJS Controller)
import {
  Controller, Get, Post, Param, Body,
  UseGuards, Req, ParseIntPipe, HttpCode, HttpStatus, ForbiddenException
} from '@nestjs/common';
import { OrderService } from './order.service';
import { AuthGuard } from './auth.guard';

interface CreateOrderDto {
  eventId: number;
  eventName: string;
  category: string;
  quantity: number;
}

@Controller('orders')
export class OrderController {
  constructor(private orderService: OrderService) {}

  // POST /orders - Ticket kaufen
  @Post()
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateOrderDto, @Req() req: any) {
    return this.orderService.create({
      userId: req.user.sub,
      userEmail: req.user.email,
      ...dto,
    });
  }

  // POST /orders/:id/pay - "Fake Payment" durchführen
  @Post(':id/pay')
  @UseGuards(AuthGuard)
  async pay(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.orderService.processPayment(id, req.user.sub);
  }

  // GET /orders/my - Eigene Bestellungen
  @Get('my')
  @UseGuards(AuthGuard)
  getMyOrders(@Req() req: any) {
    return this.orderService.findByUser(req.user.sub);
  }

  // GET /orders - Alle Bestellungen (nur Admin/Staff)
  @Get()
  @UseGuards(AuthGuard)
  getAll(@Req() req: any) {
    if (!['admin', 'staff'].includes(req.user.role)) {
      throw new ForbiddenException('Nur Admin/Staff');
    }
    return this.orderService.findAll();
  }

  // GET /orders/:id - Einzelne Bestellung
  @Get(':id')
  @UseGuards(AuthGuard)
  getOne(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    const order = this.orderService.findOne(id);
    if (order.userId !== req.user.sub && !['admin', 'staff'].includes(req.user.role)) {
      throw new ForbiddenException('Keine Berechtigung');
    }
    return order;
  }

  // POST /orders/validate-qr - QR-Code validieren (für Check-in Service)
  @Post('validate-qr')
  validateQr(@Body() dto: { qrCode: string }) {
    const order = this.orderService.validateQrCode(dto.qrCode);
    if (!order) return { valid: false };
    return { valid: true, order };
  }

  // POST /orders/:id/checkin - Als eingecheckt markieren
  @Post(':id/checkin')
  markCheckedIn(@Param('id', ParseIntPipe) id: number) {
    return this.orderService.markCheckedIn(id);
  }

  @Get('health/check')
  health() {
    return { status: 'ok', service: 'order-service' };
  }
}
