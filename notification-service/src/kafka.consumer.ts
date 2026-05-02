// kafka.consumer.ts - Kafka Consumer (aus VL9: Consumer API, Consumer Groups)
// Wenn Kafka verfuegbar: empfaengt Events via Topics
// Wenn Kafka NICHT verfuegbar: Events kommen via HTTP-Webhook (notification.controller.ts)
import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { Kafka, Consumer, EachMessagePayload } from 'kafkajs';
import { NotificationService } from './notification.service';

@Injectable()
export class KafkaConsumer implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(KafkaConsumer.name);
  private consumer: Consumer | null = null;
  private connected = false;

  constructor(private notificationService: NotificationService) {}

  async onModuleInit() {
    const broker = process.env.KAFKA_BROKER || 'localhost:9092';

    const kafka = new Kafka({
      clientId: 'notification-service',
      brokers: [broker],
      connectionTimeout: 3000,
      requestTimeout: 3000,
      retry: { retries: 1, initialRetryTime: 300 },
    });

    // Consumer Group (aus VL9: jede Nachricht nur einmal pro Gruppe verarbeitet)
    this.consumer = kafka.consumer({ groupId: 'notification-group' });

    try {
      await this.consumer.connect();
      this.connected = true;

      // Topics abonnieren (aus VL9: Publish-Subscribe)
      await this.consumer.subscribe({
        topics: ['order.created', 'order.paid', 'checkin.completed'],
        fromBeginning: false,
      });

      await this.consumer.run({
        eachMessage: async (payload: EachMessagePayload) => {
          const { topic, message } = payload;
          try {
            const data = JSON.parse(message.value?.toString() || '{}');
            data._source = 'kafka';
            this.logger.log('[Kafka Consumer] Topic erhalten: ' + topic);
            await this.notificationService.handleTopicEvent(topic, data);
          } catch (err) {
            this.logger.error('Fehler bei Verarbeitung: ' + err);
          }
        },
      });

      this.logger.log('Kafka Consumer aktiv, wartet auf Topics...');
    } catch (err) {
      this.connected = false;
      this.logger.warn(
        'Kafka Consumer inaktiv - Events werden via HTTP-Webhook empfangen'
      );
    }
  }

  async onModuleDestroy() {
    if (this.connected && this.consumer) {
      await this.consumer.disconnect();
    }
  }
}
