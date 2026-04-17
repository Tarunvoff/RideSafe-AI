/**
 * @forensic audit: Rule-EG-1
 * @forensic identity: heuristic-telemetry-adapter
 * @forensic status: HARDENED
 * @forensic provisioning: BASELINE
 */
import { Injectable, Logger } from '@nestjs/common';
import { ITelemetryAdapter } from '../interfaces/telemetry-adapter.interface';
import { KafkaReliableProducerService } from '../../kafka/kafka-reliable-producer.service';
import { createHash } from 'crypto';

@Injectable()
export class HeuristicTelemetryAdapter implements ITelemetryAdapter {
  private readonly logger = new Logger(HeuristicTelemetryAdapter.name);

  constructor(private readonly kafkaProducer: KafkaReliableProducerService) {}

  private deterministicJitter(driverId: string, timestamp: number): { latOffset: number; lngOffset: number } {
    const digest = createHash('sha256').update(`${driverId}:${timestamp}`).digest();
    const latUnit = digest.readUInt16BE(0) / 65535;
    const lngUnit = digest.readUInt16BE(2) / 65535;
    return {
      latOffset: (latUnit - 0.5) * 0.002,
      lngOffset: (lngUnit - 0.5) * 0.002,
    };
  }

  async publishLocation(payload: {
    driverId: string;
    lat: number;
    lng: number;
    speed?: number;
    timestamp?: number;
    platform: string;
  }): Promise<void> {
    const ts = payload.timestamp ?? Math.floor(Date.now() / 1000);
    const { latOffset, lngOffset } = this.deterministicJitter(payload.driverId, ts);
    
    const jitterLat = payload.lat + latOffset;
    const jitterLng = payload.lng + lngOffset;

    this.logger.debug(`[HEURISTIC] Publishing precision location for ${payload.driverId}`);
    
    await this.kafkaProducer.publishDriverLocation({
      ...payload,
      lat: jitterLat,
      lng: jitterLng,
      timestamp: ts,
    });
  }
}
