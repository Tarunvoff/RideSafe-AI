import { Injectable, Logger } from '@nestjs/common';
import { ITelemetryAdapter } from '../interfaces/telemetry-adapter.interface';
import { KafkaReliableProducerService } from '../../kafka/kafka-reliable-producer.service';

@Injectable()
export class LiveTelemetryAdapter implements ITelemetryAdapter {
  private readonly logger = new Logger(LiveTelemetryAdapter.name);

  constructor(private readonly kafkaProducer: KafkaReliableProducerService) {}

  async publishLocation(payload: {
    driverId: string;
    lat: number;
    lng: number;
    speed?: number;
    timestamp?: number;
    platform: string;
  }): Promise<void> {
    const ts = payload.timestamp ?? Math.floor(Date.now() / 1000);
    
    // No jitter applied in LIVE mode. Absolute fidelity preserved.
    this.logger.debug(`[LIVE] Publishing raw device location for ${payload.driverId}`);
    
    await this.kafkaProducer.publishDriverLocation({
      ...payload,
      timestamp: ts,
    });
  }
}
