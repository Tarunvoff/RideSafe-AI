// Aegis Stream 2 — Kafka Pipeline
import { Inject, Injectable } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';

type DriverLocationPayload = {
  rider_id: string;
  lat: number;
  lng: number;
  timestamp: string;
  platform: string;
};

@Injectable()
export class KafkaProducerService {
  constructor(
    @Inject('KAFKA_SERVICE')
    private readonly kafkaClient: ClientKafka,
  ) {}

  publishDriverLocation(payload: DriverLocationPayload) {
    return this.kafkaClient.emit('driver_telemetry', {
      key: payload.rider_id,
      value: payload,
    });
  }
}
