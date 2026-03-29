// Aegis Stream 2 — Kafka Pipeline
import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'KAFKA_SERVICE',
        transport: Transport.KAFKA,
        options: {
          client: {
            clientId: 'aegis-backend',
            brokers: [process.env.KAFKA_BROKER_URL ?? 'localhost:9092'],
          },
          consumer: {
            groupId: 'aegis-backend-producer-group',
          },
        },
      },
    ]),
  ],
  exports: [ClientsModule],
})
export class KafkaModule {}
