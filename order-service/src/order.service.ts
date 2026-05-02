// order.service.ts - Bestellungen & Zahlungen (aus VL4: Services)
// Integriert Kafka (aus VL9) für Event-Driven Notifications
import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import fetch from 'node-fetch';
import { KafkaProducer } from './kafka.producer';

export type OrderStatus = 'pending' | 'paid' | 'cancelled' | 'checked_in';
export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded';

export interface Order {
  id: number;
  userId: number;
  userEmail: string;
  eventId: number;
  eventName: string;
  category: string;
  quantity: number;
  totalPrice: number;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  qrCode: string;        // QR-Code für Check-in
  createdAt: string;
  updatedAt: string;
}

@Injectable()
export class OrderService {
  private readonly logger = new Logger(OrderService.name);
  private orders: Map<number, Order> = new Map();
  private nextId = 1;
  private eventServiceUrl = process.env.EVENT_SERVICE_URL || 'http://localhost:3002';

  constructor(private kafkaProducer: KafkaProducer) {}

  // QR-Code generieren (einfache Implementierung)
  private generateQrCode(orderId: number, userId: number): string {
    const data = `ticket:${orderId}:user:${userId}:ts:${Date.now()}`;
    return Buffer.from(data).toString('base64');
  }

  async create(dto: {
    userId: number;
    userEmail: string;
    eventId: number;
    eventName: string;
    category: string;
    quantity: number;
  }): Promise<Order> {
    // Plätze beim Event Service reservieren (Service-zu-Service Kommunikation, aus VL8)
    let totalPrice = dto.quantity * 10; // Fallback-Preis
    try {
      const res = await fetch(`${this.eventServiceUrl}/events/${dto.eventId}/reserve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: dto.category, count: dto.quantity }),
      });
      if (res.ok) {
        const data = await res.json() as any;
        totalPrice = data.totalPrice;
      } else {
        const err = await res.json() as any;
        throw new BadRequestException(err.message || 'Reservierung fehlgeschlagen');
      }
    } catch (err: any) {
      if (err instanceof BadRequestException) throw err;
      this.logger.warn('Event Service nicht erreichbar, nutze Fallback-Preis');
    }

    const order: Order = {
      id: this.nextId++,
      ...dto,
      totalPrice,
      status: 'pending',
      paymentStatus: 'pending',
      qrCode: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    order.qrCode = this.generateQrCode(order.id, order.userId);
    this.orders.set(order.id, order);

    // Kafka Event veröffentlichen (aus VL9: Producer API, Publish-Subscribe)
    await this.kafkaProducer.send('order.created', {
      orderId: order.id,
      userId: order.userId,
      userEmail: order.userEmail,
      eventId: order.eventId,
      eventName: order.eventName,
      totalPrice: order.totalPrice,
      qrCode: order.qrCode,
    });

    return order;
  }

  // "Fake Payment" (aus der Aufgabe)
  async processPayment(orderId: number, userId: number): Promise<Order> {
    const order = this.findOne(orderId);
    if (order.userId !== userId) throw new BadRequestException('Nicht berechtigt');
    if (order.paymentStatus === 'completed') throw new BadRequestException('Bereits bezahlt');

    // Fake Payment: immer erfolgreich
    order.paymentStatus = 'completed';
    order.status = 'paid';
    order.updatedAt = new Date().toISOString();
    this.orders.set(orderId, order);

    // Kafka Event: Zahlung abgeschlossen (aus VL9: Topics)
    await this.kafkaProducer.send('order.paid', {
      orderId: order.id,
      userId: order.userId,
      userEmail: order.userEmail,
      eventName: order.eventName,
      totalPrice: order.totalPrice,
      qrCode: order.qrCode,
    });

    return order;
  }

  findOne(id: number): Order {
    const order = this.orders.get(id);
    if (!order) throw new NotFoundException(`Bestellung ${id} nicht gefunden`);
    return order;
  }

  findByUser(userId: number): Order[] {
    return Array.from(this.orders.values()).filter(o => o.userId === userId);
  }

  findAll(): Order[] {
    return Array.from(this.orders.values());
  }

  // Check-in Status setzen (vom Check-in Service aufgerufen)
  markCheckedIn(orderId: number): Order {
    const order = this.findOne(orderId);
    if (order.paymentStatus !== 'completed') throw new BadRequestException('Ticket nicht bezahlt');
    if ((order.status as string) === 'checked_in') throw new BadRequestException('Bereits eingecheckt');
    order.status = 'checked_in';
    order.updatedAt = new Date().toISOString();
    this.orders.set(orderId, order);
    return order;
  }

  // QR-Code validieren (für Check-in Service)
  validateQrCode(qrCode: string): Order | null {
    return Array.from(this.orders.values()).find(o => o.qrCode === qrCode) || null;
  }
}
