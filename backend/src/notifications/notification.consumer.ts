import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Consumer, Kafka, logLevel } from 'kafkajs';
import { NotificationService } from './notification.service';

@Injectable()
export class NotificationConsumer implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(NotificationConsumer.name);
  private consumer: Consumer | null = null;

  constructor(private readonly notificationService: NotificationService) {}

  async onModuleInit(): Promise<void> {
    const brokers = (process.env.KAFKA_BROKER_URL ?? 'localhost:9092').split(',');
    const kafka = new Kafka({
      clientId: process.env.NOTIFICATION_KAFKA_CLIENT_ID ?? 'aegis-notification-consumer',
      brokers,
      logLevel: logLevel.ERROR,
    });

    this.consumer = kafka.consumer({
      groupId: process.env.NOTIFICATION_CONSUMER_GROUP ?? 'aegis-notification-group',
    });

    try {
      await this.consumer.connect();

      const topics = this.getTopics();
      for (const topic of topics) {
        await this.consumer.subscribe({ topic, fromBeginning: false });
      }

      await this.consumer.run({
        eachMessage: async ({ topic, partition, message }) => {
          if (!message.value) return;

          try {
            const payload = JSON.parse(message.value.toString()) as Record<string, unknown>;
            const headers: Record<string, string> = {};

            if (message.headers) {
              for (const [key, value] of Object.entries(message.headers)) {
                headers[key] = value?.toString() ?? '';
              }
            }

            await this.notificationService.processKafkaEvent(topic, payload, {
              partition,
              offset: message.offset,
              key: message.key?.toString(),
              headers,
            });
          } catch (err) {
            const errorMessage = err instanceof Error ? err.message : String(err);
            this.logger.error(
              `[notification-consumer] failed for topic=${topic} partition=${partition} offset=${message.offset}: ${errorMessage}`,
            );
          }
        },
      });

      this.logger.log(`[notification-consumer] subscribed to topics: ${topics.join(', ')}`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      this.logger.warn(`[notification-consumer] Kafka unavailable: ${errorMessage}`);
      this.consumer = null;
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (!this.consumer) return;

    await this.consumer.disconnect().catch(() => undefined);
    this.logger.log('[notification-consumer] disconnected');
  }

  private getTopics(): string[] {
    const configured = process.env.NOTIFICATION_TOPICS?.split(',')
      .map((topic) => topic.trim())
      .filter(Boolean);

    if (configured && configured.length > 0) {
      return configured;
    }

    return ['user_events', 'payout_events', 'fraud_events', 'policy_events'];
  }
}