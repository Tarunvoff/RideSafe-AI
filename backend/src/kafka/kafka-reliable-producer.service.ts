/**
 * kafka-reliable-producer.service.ts — Production-grade Kafka producer.
 *
 * Features implemented:
 *   A. Producer Config  → acks=all, retries=5, idempotent=true
 *   B. Dead Letter Queue → DB-persisted kafka_dlq on unrecoverable failure
 *   C. Fallback Storage  → Redis LIST fallback before hitting DB
 *
 * Failure cascade:
 *   Kafka emit ──(fail)──► Redis fallback queue
 *                                   ──(fail)──► DB kafka_dlq
 *
 * H3 enrichment is preserved from the original KafkaProducerService.
 */

import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { Kafka, Producer, ProducerRecord, CompressionTypes, logLevel } from 'kafkajs';
import * as h3 from 'h3-js';
import { KafkaDlqService } from './kafka-dlq.service';
import { RedisFallbackQueueService } from './redis-fallback-queue.service';
import { PrismaService } from '../prisma/prisma.service';

type DriverLocationPayload = {
  driverId: string;
  lat: number;
  lng: number;
  speed?: number;
  timestamp: number;
  platform: string;
  h3_cell?: string;
};

type LastLocation = {
  lat: number;
  lng: number;
  timestamp: number;
};

const EARTH_RADIUS_KM = 6371;
const FALLBACK_SPEED_KMH_MIN = 12;
const FALLBACK_SPEED_KMH_MAX = 30;
const URBAN_BASE_SPEED_KMH = 19;

const toRadians = (value: number) => (value * Math.PI) / 180;

const haversineKm = (lat1: number, lng1: number, lat2: number, lng2: number) => {
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
};

const fallbackSpeedFromTimestamp = (timestamp: number): number => {
  const hour = new Date(timestamp * 1000).getUTCHours();
  const rushHourPenalty = [7, 8, 9, 17, 18, 19].includes(hour) ? 4 : 0;
  const nightBoost = [23, 0, 1, 2, 3, 4, 5].includes(hour) ? 3 : 0;
  const inferred = URBAN_BASE_SPEED_KMH - rushHourPenalty + nightBoost;
  return Math.max(FALLBACK_SPEED_KMH_MIN, Math.min(FALLBACK_SPEED_KMH_MAX, inferred));
};

const DLQ_TOPIC = 'driver_telemetry_dlq';
const MAIN_TOPIC = 'driver_telemetry';
const H3_RESOLUTION = 8;

@Injectable()
export class KafkaReliableProducerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(KafkaReliableProducerService.name);
  private readonly lastLocations = new Map<string, LastLocation>();

  /** Raw KafkaJS producer — bypasses NestJS ClientKafka so we control acks. */
  private producer: Producer | null = null;
  private kafkaAvailable = false;

  constructor(
    private readonly dlq: KafkaDlqService,
    private readonly redisFallback: RedisFallbackQueueService,
    private readonly prisma: PrismaService,
  ) {}

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  async onModuleInit(): Promise<void> {
    await this.connectProducer();

    // Register drain function so Redis and DLQ can push back to Kafka
    const emitFn = async (
      topic: string,
      key: string | undefined,
      payload: Record<string, unknown>,
    ) => {
      await this.emitRaw(topic, key, payload);
    };

    this.redisFallback.registerDrainFn(emitFn);
    this.dlq.registerReplayFn(emitFn);
  }

  async onModuleDestroy(): Promise<void> {
    if (this.producer) {
      await this.producer.disconnect().catch(() => {});
      this.logger.log('Kafka producer disconnected');
    }
  }

  // ── Producer bootstrap ─────────────────────────────────────────────────────

  private async connectProducer(): Promise<void> {
    const brokers = (process.env.KAFKA_BROKER_URL ?? 'localhost:9092').split(',');
    const kafka = new Kafka({
      clientId: 'aegis-reliable-producer',
      brokers,
      logLevel: logLevel.ERROR,
      logCreator: () => ({ label, log }) => {
          const { message, error } = log;
          if (message?.includes('leadership election') || error?.includes('leadership election')) return;
          if (message?.includes('no leader') || error?.includes('no leader')) return;
          this.logger.verbose(`[Kafka] ${label}: ${message}`);
      },
      retry: {
        retries: 8,
        initialRetryTime: 500,
        factor: 2,
        restartOnFailure: async (error: any) => {
          const isTransient = error?.message?.includes('middle of a leadership election') || 
                              error?.message?.includes('Broker not available');
          if (isTransient) {
            return true;
          }
          return false;
        }
      },
    });

    this.producer = kafka.producer({
      idempotent: true,
      maxInFlightRequests: 1,
      transactionTimeout: 30_000,
    });

    for (let i = 0; i < 3; i++) {
      try {
        await this.producer.connect();
        this.kafkaAvailable = true;
        this.logger.log(`✅ Reliable Kafka producer connected → ${brokers.join(', ')}`);
        return;
      } catch (err: any) {
        if (err?.message?.includes('middle of a leadership election') && i < 2) {
          this.logger.debug(`[Kafka] Waiting for topic leadership election... (attempt ${i + 1})`);
          await new Promise(resolve => setTimeout(resolve, 3000));
          continue;
        }
        this.kafkaAvailable = false;
        this.logger.warn(`⚠️  Kafka unavailable on startup: ${err.message} — will use Redis/DB fallback`);
        break;
      }
    }
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  /**
   * Publish a driver location event with H3 enrichment.
   * Implements the full three-tier reliability cascade.
   */
  async publishDriverLocation(payload: DriverLocationPayload): Promise<void> {
    const driverId = payload.driverId;
    const now = payload.timestamp;
    const previous = this.lastLocations.get(driverId);
    let speed = payload.speed ?? 0;

    if (!speed || speed <= 0) {
      if (previous && now > previous.timestamp) {
        const distanceKm = haversineKm(previous.lat, previous.lng, payload.lat, payload.lng);
        const hours = (now - previous.timestamp) / 3600;
        speed = hours > 0 ? distanceKm / hours : 0;
      }
      if (!speed || speed <= 0) {
        speed = fallbackSpeedFromTimestamp(now);
      }
      speed = Math.round(speed * 10) / 10;
    }

    this.lastLocations.set(driverId, { lat: payload.lat, lng: payload.lng, timestamp: now });

    const h3_cell = h3.latLngToCell(payload.lat, payload.lng, H3_RESOLUTION);
    const enriched = { ...payload, speed, h3_cell };

    await this.emit(MAIN_TOPIC, payload.driverId, enriched);
  }

  /**
   * Emit to any topic with the full reliability cascade.
   * Public so other services can use the producer for non-telemetry events.
   */
  async emit(
    topic: string,
    key: string | undefined,
    payload: Record<string, unknown>,
  ): Promise<void> {
    // 1. Try Kafka (acks=all, retries=5)
    if (this.kafkaAvailable && this.producer) {
      try {
        await this.emitRaw(topic, key, payload);
        return; // ✅ success
      } catch (err) {
        this.logger.warn(`[Kafka] Emit failed for topic=${topic}: ${err}`);
        this.kafkaAvailable = false; // circuit-breaker style: stop hitting broker
      }
    }

    // 2. Kafka down → try Redis fallback queue
    const pushedToRedis = await this.redisFallback.push(topic, key, payload);
    if (pushedToRedis) {
      this.logger.warn(`[Kafka→Redis] Event queued in Redis fallback: topic=${topic}`);
      return;
    }

    // 3. Redis also down → persist to DB DLQ
    this.logger.error(`[Kafka→Redis→DLQ] All transports failed — writing to DB DLQ: topic=${topic}`);
    await this.dlq.pushToDlq({
      topic,
      eventKey: key,
      payload,
      error: 'Kafka and Redis both unavailable',
    });
  }

  // ── Internal emit (no fallback) ───────────────────────────────────────────

  /** Direct Kafka emit — throws on failure. Called by drain jobs too. */
  async emitRaw(
    topic: string,
    key: string | undefined,
    payload: Record<string, unknown>,
  ): Promise<void> {
    if (!this.producer) throw new Error('Producer not initialised');

    const record: ProducerRecord = {
      topic,
      messages: [
        {
          key: key ?? undefined,
          value: JSON.stringify(payload),
        },
      ],
      compression: CompressionTypes.GZIP,
    };

    await this.producer.send(record);

    // Re-mark broker as available if it was down
    if (!this.kafkaAvailable) {
      this.kafkaAvailable = true;
      this.logger.log('[Kafka] Broker reachable again ✅');
    }
  }

  /**
   * Explicitly push a message to the DLQ topic on the broker (if reachable).
   * Used for failed downstream processing (not producer failures).
   */
  async publishToDlqTopic(originalPayload: Record<string, unknown>, reason: string): Promise<void> {
    const dlqPayload = {
      ...originalPayload,
      _dlq_reason: reason,
      _dlq_timestamp: Date.now(),
    };

    try {
      await this.emitRaw(DLQ_TOPIC, (originalPayload.driverId as string) ?? undefined, dlqPayload);
      this.logger.warn(`[DLQ topic] Pushed to ${DLQ_TOPIC}: reason="${reason}"`);
    } catch {
      // If DLQ topic is also unreachable, fall back to DB
      await this.dlq.pushToDlq({
        topic: DLQ_TOPIC,
        eventKey: (originalPayload.driverId as string) ?? undefined,
        payload: dlqPayload,
        error: `DLQ topic unreachable: ${reason}`,
      });
    }
  }

  /** Health-check: returns Kafka connectivity status. */
  isKafkaAvailable(): boolean {
    return this.kafkaAvailable;
  }
}
