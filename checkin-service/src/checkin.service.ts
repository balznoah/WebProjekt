// checkin.service.ts - QR validieren, Einlass zählen (aus der Aufgabe)
// Nutzt Service-zu-Service Kommunikation zum Order Service (aus VL8: Microservice-Architektur)
import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import fetch from 'node-fetch';
import { KafkaProducer } from './kafka.producer';

export interface CheckinRecord {
  id: number;
  orderId: number;
  userId: number;
  eventId: number;
  eventName: string;
  checkedInAt: string;
  staffId: number;
  success: boolean;
  reason?: string;
}

@Injectable()
export class CheckinService {
  private readonly logger = new Logger(CheckinService.name);
  private checkins: Map<number, CheckinRecord> = new Map();
  private nextId = 1;
  // Einlass-Zähler pro Event (aus Aufgabe: Einlass zählen)
  private entryCount: Map<number, number> = new Map();
  private orderServiceUrl = process.env.ORDER_SERVICE_URL || 'http://localhost:3003';

  constructor(private kafkaProducer: KafkaProducer) {}

  async validateAndCheckin(qrCode: string, staffId: number): Promise<CheckinRecord> {
    let order: any = null;
    let success = false;
    let reason = '';

    // QR-Code beim Order Service validieren (Service-zu-Service HTTP, aus VL8)
    try {
      const res = await fetch(`${this.orderServiceUrl}/orders/validate-qr`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qrCode }),
      });
      const data = await res.json() as any;

      if (!data.valid) {
        reason = 'QR-Code ungültig oder nicht gefunden';
      } else {
        order = data.order;
        if (order.status === 'checked_in') {
          reason = 'Ticket bereits eingecheckt';
        } else if (order.paymentStatus !== 'completed') {
          reason = 'Ticket nicht bezahlt';
        } else {
          success = true;
          // Einlass beim Order Service markieren
          await fetch(`${this.orderServiceUrl}/orders/${order.id}/checkin`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
          });
          // Einlass-Zähler erhöhen
          const current = this.entryCount.get(order.eventId) || 0;
          this.entryCount.set(order.eventId, current + 1);
        }
      }
    } catch (err) {
      this.logger.error('Order Service Fehler', err);
      reason = 'Fehler bei der Validierung';
    }

    const record: CheckinRecord = {
      id: this.nextId++,
      orderId: order?.id ?? 0,
      userId: order?.userId ?? 0,
      eventId: order?.eventId ?? 0,
      eventName: order?.eventName ?? 'Unbekannt',
      checkedInAt: new Date().toISOString(),
      staffId,
      success,
      reason: success ? undefined : reason,
    };
    this.checkins.set(record.id, record);

    if (success) {
      // Kafka Event: Check-in erfolgreich (aus VL9: Topics/Publish-Subscribe)
      await this.kafkaProducer.send('checkin.completed', {
        orderId: record.orderId,
        userId: record.userId,
        eventId: record.eventId,
        eventName: record.eventName,
        checkedInAt: record.checkedInAt,
      });
    }

    return record;
  }

  getCheckins(eventId?: number): CheckinRecord[] {
    const all = Array.from(this.checkins.values());
    return eventId ? all.filter(c => c.eventId === eventId) : all;
  }

  // Einlass-Statistiken (aus Aufgabe: Einlass zählen)
  getStats(): { eventId: number; count: number }[] {
    return Array.from(this.entryCount.entries()).map(([eventId, count]) => ({ eventId, count }));
  }
}
