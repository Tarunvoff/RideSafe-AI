// Aegis Stream 2 — Kafka Pipeline
import { Inject, Injectable, Logger } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import * as h3 from 'h3-js'; // Must match H3_RESOLUTION=8 everywhere

type DriverLocationPayload = {
  rider_id: string;
  lat: number;
  lng: number;
  timestamp: number;
  platform: string;
  h3_cell?: string;
};

@Injectable()
export class KafkaProducerService {
  private readonly logger = new Logger(KafkaProducerService.name);

  constructor(
    @Inject('KAFKA_SERVICE')
    private readonly kafkaClient: ClientKafka,
  ) {}

  publishDriverLocation(payload: DriverLocationPayload) {
    // 1. Mandatory Core Principle: Convert GPS to H3 cell before emitting
    const resolution = 8;
    const h3_cell = h3.latLngToCell(payload.lat, payload.lng, resolution);

    const enrichedPayload = {
      ...payload,
      h3_cell,
    };

    return this.kafkaClient.emit('driver_telemetry', {
      key: payload.rider_id,
      value: enrichedPayload,
    });
  }
}
