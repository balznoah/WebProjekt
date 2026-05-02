// kafka.producer.ts fuer Check-in Service - gleiche Dual-Mode Strategie
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
      clientId: 'checkin-service',
      brokers: [broker],
      connectionTimeout: 3000,
      requestTimeout: 3000,
      retry: { retries: 1, initialRetryTime: 300 },
    });
    this.producer = kafka.producer();

    try {
      await this.producer.connect();
      this.kafkaConnected = true;
      this.logger.log('Kafka Producer verbunden');
    } catch {
      this.kafkaConnected = false;
      this.logger.warn('Kafka nicht erreichbar - Nutze HTTP-Fallback');
    }
  }

  async onModuleDestroy() {
    if (this.kafkaConnected && this.producer) await this.producer.disconnect();
  }

  async send(topic: string, message: object): Promise<void> {
    if (this.kafkaConnected && this.producer) {
      try {
        await this.producer.send({ topic, messages: [{ value: JSON.stringify(message) }] });
        this.logger.log('[Kafka] Topic: ' + topic);
        return;
      } catch (err) {
        this.logger.warn('[Kafka] Fehler, nutze HTTP-Fallback');
      }
    }
    try {
      await fetch(this.notificationUrl + '/notifications/event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, payload: message }),
      });
      this.logger.log('[HTTP-Fallback] Topic: ' + topic);
    } catch (err) {
      this.logger.error('[HTTP-Fallback] Fehler: ' + err);
    }
  }
}
