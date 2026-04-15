// kafka.module.ts — Aegis Stream 2 Kafka Pipeline
// Production-grade module: DLQ service + Redis fallback + Reliable producer

import { forwardRef, Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { PrismaModule } from '../prisma/prisma.module';
import { StateModule } from '../state/state.module';
import { InsuranceModule } from '../insurance/insurance.module';

import { KafkaProducerService } from './kafka.producer.service';
import { KafkaReliableProducerService } from './kafka-reliable-producer.service';
import { KafkaDlqService } from './kafka-dlq.service';
import { RedisFallbackQueueService } from './redis-fallback-queue.service';
import { ZoneMonitoringService } from './zone-monitoring.service';
import { KafkaAdminService } from './kafka-admin.service';
import { logLevel } from 'kafkajs';

@Module({
  imports: [
    PrismaModule,
    StateModule,
    forwardRef(() => InsuranceModule),
    ClientsModule.register([
      {
        name: 'KAFKA_SERVICE',
        transport: Transport.KAFKA,
        options: {
          client: {
            clientId: 'aegis-backend-client',
            brokers: [(process.env.KAFKA_BROKER_URL ?? 'localhost:9092')],
            logLevel: logLevel.ERROR,
            logCreator: () => ({ label, log }) => {
                const { message, error } = log;
                if (message?.includes('leadership election') || error?.includes('leadership election')) return;
                if (message?.includes('no leader') || error?.includes('no leader')) return;
                console.debug(`[Kafka-Client] ${label}: ${message}`);
            },
            retry: {
              retries: 5,
              initialRetryTime: 500,
              maxRetryTime: 10000,
              factor: 2,
            },
          },
          consumer: {
            groupId: 'aegis-backend-producer-group-client',
            retry: {
              retries: 5,
              initialRetryTime: 500,
            },
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
    KafkaAdminService,
    KafkaProducerService,           // preserved — used by FraudModule
    KafkaReliableProducerService,   // new — used by any service needing reliability
    KafkaDlqService,                // new — DB-backed DLQ
    RedisFallbackQueueService,      // new — Redis fallback queue
    ZoneMonitoringService,
  ],
  exports: [
    ClientsModule,
    KafkaAdminService,
    KafkaProducerService,
    KafkaReliableProducerService,
    KafkaDlqService,
    RedisFallbackQueueService,
    ZoneMonitoringService,
  ],
})
export class KafkaModule {}
