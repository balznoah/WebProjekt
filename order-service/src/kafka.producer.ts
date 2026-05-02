// kafka.producer.ts - Kafka Producer mit HTTP-Fallback (aus VL9: Kafka Producer API)
// Strategie: Kafka (Primär, async) → HTTP-Webhook (Fallback, aus VL8: Service-zu-Service)
import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { Kafka, Producer } from 'kafkajs';
import fetch from 'node-fetch';

@Injectable()
export class KafkaProducer implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(KafkaProducer.name);
  private producer: Producer | null = null;
  private kafkaConnected = false;
  private notificationUrl: string;

  async onModuleInit() {
    const broker = process.env.KAFKA_BROKER || 'localhost:9092';
    this.notificationUrl = process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3005';

    const kafka = new Kafka({
      clientId: process.env.SERVICE_NAME || 'ticketing-service',
      brokers: [broker],
      connectionTimeout: 3000,
      requestTimeout: 3000,
      retry: { retries: 1, initialRetryTime: 300 },
    });
    this.producer = kafka.producer();

    try {
      await this.producer.connect();
      this.kafkaConnected = true;
      this.logger.log('Kafka Producer verbunden (Broker: ' + broker + ')');
    } catch (err) {
      this.kafkaConnected = false;
      this.logger.warn('Kafka nicht erreichbar - Nutze HTTP-Fallback zum Notification Service');
    }
  }

  async onModuleDestroy() {
    if (this.kafkaConnected && this.producer) {
      await this.producer.disconnect();
    }
  }

  async send(topic: string, message: object): Promise<void> {
    if (this.kafkaConnected && this.producer) {
      try {
        await this.producer.send({
          topic,
          messages: [{ value: JSON.stringify(message) }],
        });
        this.logger.log('[Kafka] Topic: ' + topic);
        return;
      } catch (err) {
        this.logger.warn('[Kafka] Senden fehlgeschlagen, nutze HTTP-Fallback: ' + err);
      }
    }
    await this.sendViaHttp(topic, message);
  }

  private async sendViaHttp(topic: string, message: object): Promise<void> {
    try {
      const res = await fetch(this.notificationUrl + '/notifications/event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, payload: message }),
      });
      if (res.ok) {
        this.logger.log('[HTTP-Fallback] Topic: ' + topic + ' -> ' + this.notificationUrl);
      } else {
        this.logger.error('[HTTP-Fallback] Status ' + res.status + ' fuer Topic: ' + topic);
      }
    } catch (err) {
      this.logger.error('[HTTP-Fallback] Notification Service nicht erreichbar: ' + err);
    }
  }
}
