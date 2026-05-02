// notification.controller.ts
// Empfaengt Events via HTTP-Webhook (Fallback) ODER via Kafka Consumer (aus VL9)
import { Controller, Get, Post, Query, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { NotificationService } from './notification.service';

// Welche Topics auf welche Handler gemappt werden (aus VL9: Topic-Konzept)
const TOPIC_HANDLERS: Record<string, string> = {
  'order.created': 'order_created',
  'order.paid':    'ticket_confirmed',
  'checkin.completed': 'checkin_success',
};

@Controller('notifications')
export class NotificationController {
  constructor(private notificationService: NotificationService) {}

  // GET /notifications - Log aller Benachrichtigungen
  @Get()
  getAll(@Query('email') email: string) {
    if (email) return this.notificationService.getByRecipient(email);
    return this.notificationService.getAll();
  }

  // POST /notifications/event - HTTP-Webhook Endpunkt (Fallback wenn kein Kafka)
  // Empfaengt dasselbe Format wie Kafka-Topics (topic + payload)
  @Post('event')
  @HttpCode(HttpStatus.OK)
  async receiveEvent(@Body() dto: { topic: string; payload: any }) {
    const { topic, payload } = dto;
    await this.notificationService.handleTopicEvent(topic, payload);
    return { received: true, topic };
  }

  @Get('health')
  health() {
    return { status: 'ok', service: 'notification-service' };
  }
}
