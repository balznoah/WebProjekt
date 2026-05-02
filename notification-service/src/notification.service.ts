// notification.service.ts - E-Mail/Push simuliert (aus der Aufgabe)
// Verarbeitet Events aus Kafka Consumer (VL9) ODER HTTP-Webhook (Fallback)
import { Injectable, Logger } from '@nestjs/common';

export interface Notification {
  id: number;
  type: string;
  recipient: string;
  subject: string;
  body: string;
  data: any;
  sentAt: string;
  channel: 'email' | 'push';
  source: 'kafka' | 'http-fallback';
}

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);
  private notifications: Notification[] = [];
  private nextId = 1;

  // Zentraler Handler fuer beide Einstiegspunkte (Kafka + HTTP-Webhook)
  async handleTopicEvent(topic: string, data: any): Promise<void> {
    const source = data._source || 'http-fallback';
    switch (topic) {
      case 'order.created':
        await this.sendNotification({
          type: 'order_created',
          recipient: data.userEmail,
          subject: 'Bestellung #' + data.orderId + ' eingegangen',
          body: 'Hallo! Deine Bestellung fuer "' + data.eventName +
                '" wurde aufgenommen. Bitte jetzt bezahlen, um dein Ticket zu erhalten.',
          data,
          source,
        });
        break;
      case 'order.paid':
        await this.sendNotification({
          type: 'ticket_confirmed',
          recipient: data.userEmail,
          subject: 'Dein Ticket fuer "' + data.eventName + '"',
          body: 'Zahlung erfolgreich! Dein QR-Code: ' + data.qrCode +
                '. Zeige ihn am Eingang vor.',
          data,
          source,
        });
        break;
      case 'checkin.completed':
        await this.sendNotification({
          type: 'checkin_success',
          recipient: 'system-log',
          subject: 'Check-in bei Event ' + data.eventId,
          body: 'Nutzer ' + data.userId + ' eingecheckt bei "' + data.eventName + '"',
          data,
          source,
        });
        break;
      default:
        this.logger.warn('Unbekanntes Topic: ' + topic);
    }
  }

  async sendNotification(dto: {
    type: string;
    recipient: string;
    subject: string;
    body: string;
    data: any;
    source: 'kafka' | 'http-fallback';
  }): Promise<Notification> {
    const notification: Notification = {
      id: this.nextId++,
      ...dto,
      sentAt: new Date().toISOString(),
      channel: 'email',
    };
    this.notifications.push(notification);

    this.logger.log('========================');
    this.logger.log('E-MAIL SIMULIERT [' + notification.source + ']');
    this.logger.log('An: ' + notification.recipient);
    this.logger.log('Betreff: ' + notification.subject);
    this.logger.log('Inhalt: ' + notification.body);
    this.logger.log('========================');

    return notification;
  }

  getAll(): Notification[] {
    return [...this.notifications].reverse();
  }

  getByRecipient(email: string): Notification[] {
    return this.notifications.filter(n => n.recipient === email).reverse();
  }
}
