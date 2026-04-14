// Aegis Stream 2 — Kafka Pipeline
import { Inject, Injectable, Logger } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import * as h3 from 'h3-js'; // Must match H3_RESOLUTION=8 everywhere
import { RedisStateService } from '../state/redis-state.service';

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
// Calibrated from dense-city last-mile rider telemetry ranges (15-28 km/h).
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

@Injectable()
export class KafkaProducerService {
  private readonly logger = new Logger(KafkaProducerService.name);
  private readonly lastLocations = new Map<string, LastLocation>();

  constructor(
    @Inject('KAFKA_SERVICE')
    private readonly kafkaClient: ClientKafka,
    private readonly redisState: RedisStateService,
  ) {}

  publishDriverLocation(payload: DriverLocationPayload) {
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

    // 1. Mandatory Core Principle: Convert GPS to H3 cell before emitting
    const resolution = 8;
    const h3_cell = h3.latLngToCell(payload.lat, payload.lng, resolution);

    const enrichedPayload = {
      ...payload,
      speed,
      h3_cell,
    };

    this.redisState
      .getDriverState(driverId)
      .then((existing) =>
        this.redisState.setDriverState(driverId, {
          ...(existing ?? {}),
          last_location: {
            ...(existing?.last_location ?? {}),
            lat: payload.lat,
            lng: payload.lng,
            speed,
            h3_cell,
            timestamp: now,
          },
          source: 'kafka-producer',
          updatedAt: new Date().toISOString(),
        }),
      )
      .catch(() => undefined);

    this.redisState.addDriverToZone(h3_cell, driverId).catch(() => undefined);

    return this.kafkaClient.emit('driver_telemetry', {
      key: payload.driverId,
      value: enrichedPayload,
    });
  }
}
