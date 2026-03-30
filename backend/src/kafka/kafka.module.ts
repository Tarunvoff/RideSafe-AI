// kafka.module.ts — Aegis Stream 2 Kafka Pipeline
// Production-grade module: DLQ service + Redis fallback + Reliable producer

import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { PrismaModule } from '../prisma/prisma.module';

import { KafkaProducerService } from './kafka.producer.service';           // kept for backward compat
import { KafkaReliableProducerService } from './kafka-reliable-producer.service';
import { KafkaDlqService } from './kafka-dlq.service';
import { RedisFallbackQueueService } from './redis-fallback-queue.service';
import { ZoneMonitoringService } from './zone-monitoring.service';

// ── Topic declarations ────────────────────────────────────────────────────────
// These are referenced by consumers — not changed as per spec.
//   driver_telemetry     → original topic
//   driver_telemetry_dlq → new DLQ topic

@Module({
  imports: [
    PrismaModule,
    ClientsModule.register([
      {
        name: 'KAFKA_SERVICE',
        transport: Transport.KAFKA,
        options: {
          client: {
            clientId: 'aegis-backend',
            brokers: [(process.env.KAFKA_BROKER_URL ?? 'localhost:9092')],
            // ── Producer Config A: acks=all, retries=5 ─────────────────────
            // Applied at the raw KafkaJS level inside KafkaReliableProducerService.
            // ClientKafka does not expose these options directly, so they are
            // configured in the service constructor.
          },
          consumer: {
            groupId: 'aegis-backend-producer-group',
          },
          producer: {
            // Idempotency guard — prevents duplicate messages on retry
            idempotent: true,
            maxInFlightRequests: 1,
          },
        },
      },
    ]),
  ],
  providers: [
    KafkaProducerService,           // preserved — used by FraudModule
    KafkaReliableProducerService,   // new — used by any service needing reliability
    KafkaDlqService,                // new — DB-backed DLQ
    RedisFallbackQueueService,      // new — Redis fallback queue
    ZoneMonitoringService,
  ],
  exports: [
    ClientsModule,
    KafkaProducerService,
    KafkaReliableProducerService,
    KafkaDlqService,
    RedisFallbackQueueService,
    ZoneMonitoringService,
  ],
})
export class KafkaModule {}
