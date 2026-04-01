import { Injectable, Logger, NotFoundException, UnauthorizedException } from '@nestjs/common';
import * as h3 from 'h3-js';
import { KafkaReliableProducerService } from '../kafka/kafka-reliable-producer.service';
import { randomUUID } from 'crypto';
import { DynamicOAuthLoginDto } from './dto/dynamic-oauth-login.dto';
import { DynamicOAuthCallbackDto } from './dto/dynamic-oauth-callback.dto';
import { DriverStatus, QCommerceProvider } from './enums/qcommerce.enums';
import {
  DriverHistoricalWeekSnapshot,
  DriverProfilePayload,
  DriverStaticProfileParts,
  DriverWeekSummary,
  DriverWeeklySnapshotPayload,
} from './interfaces/driver-profile.interface';
import {
  DriverCityContext,
  buildStaticProfileParts,
  buildWeeklySnapshot,
  createInternalDriverId,
  decodeInternalDriverId,
  getIsoWeekKey,
} from './utils/dynamic-data.factory';

interface OAuthSessionState {
  sessionId: string;
  provider: QCommerceProvider;
  identifier: string;
  state: string;
  authCode: string;
  createdAt: Date;
  expiresAt: Date;
}

interface DriverHistoricalWeekRecord {
  weekKey: string;
  generatedAt: Date;
  weekSummary: DriverWeekSummary;
}

interface DriverRecord {
  provider: QCommerceProvider;
  identifier: string;
  internalDriverId: string;
  staticProfile: DriverStaticProfileParts;
  cityContext: DriverCityContext;
  currentWeekKey: string;
  currentSnapshot: DriverWeeklySnapshotPayload;
  previousWeeksHistory: DriverHistoricalWeekRecord[];
}

interface DriverPosition {
  lat: number;
  lng: number;
  timestamp: number;
}

@Injectable()
export class DynamicQCommerceService {
  private readonly logger = new Logger(DynamicQCommerceService.name);
  private readonly sessions = new Map<string, OAuthSessionState>();
  private readonly driverRecords = new Map<string, DriverRecord>();
  private readonly driverPositions = new Map<string, DriverPosition>();
  private weekKeyOverride?: string;

  constructor(private readonly kafkaProducer: KafkaReliableProducerService) {}

  startOAuthLogin(dto: DynamicOAuthLoginDto) {
    const sessionId = randomUUID();
    const state = randomUUID();
    const authCode = randomUUID().replace(/-/g, '').slice(0, 12);
    const createdAt = new Date();
    const expiresAt = new Date(createdAt.getTime() + 5 * 60 * 1000);

    this.sessions.set(sessionId, {
      sessionId,
      provider: dto.provider,
      identifier: dto.identifier.trim(),
      state,
      authCode,
      createdAt,
      expiresAt,
    });

    return {
      success: true,
      message: 'Dynamic OAuth session initiated. Redirect driver to provider.',
      provider: dto.provider,
      oauthSession: {
        sessionId,
        provider: dto.provider,
        state,
        expiresAt,
        redirectUri: dto.redirectUri ?? `${dto.provider}://callback`,
        dynamicAuthorizationUrl: `https://dynamic.${dto.provider}.oauth/authorize?session=${sessionId}&state=${state}`,
        demoAuthCode: authCode,
      },
    };
  }

  completeOAuthCallback(dto: DynamicOAuthCallbackDto) {
    const session = this.sessions.get(dto.sessionId);
    if (!session || session.provider !== dto.provider) {
      throw new NotFoundException('OAuth session not found or provider mismatch');
    }

    if (session.expiresAt.getTime() < Date.now()) {
      this.sessions.delete(dto.sessionId);
      throw new UnauthorizedException('OAuth session expired');
    }

    if (session.authCode !== dto.code) {
      throw new UnauthorizedException('Invalid provider authorization code');
    }

    if (dto.state && dto.state !== session.state) {
      throw new UnauthorizedException('State verification failed');
    }

    const internalDriverId = createInternalDriverId(session.provider, session.identifier);
    const record = this.ensureDriverRecord(session.provider, session.identifier, internalDriverId);
    this.refreshWeekIfNeeded(record);
    this.sessions.delete(dto.sessionId);

    return {
      success: true,
      message: 'Driver verified via provider. Profile is trusted.',
      provider: session.provider,
      oauthSession: {
        sessionId: dto.sessionId,
        completedAt: new Date(),
      },
      driverProfile: this.composeProfile(record),
    };
  }

  getDriverProfile(driverId: string) {
    let message = 'Driver profile fetched from dynamic provider cache';
    let record = this.driverRecords.get(driverId);

    if (!record) {
      const decoded = decodeInternalDriverId(driverId);
      if (!decoded) {
        throw new NotFoundException('Unknown driver identifier');
      }
      record = this.ensureDriverRecord(decoded.provider, decoded.identifier, driverId);
      message = 'Driver profile generated via deterministic seed';
    }

    const refreshed = this.refreshWeekIfNeeded(record);
    if (refreshed) {
      message = 'New week detected. Generated fresh weekly snapshot.';
    }

    return {
      success: true,
      message,
      driverProfile: this.composeProfile(record),
    };
  }

  seedDrivers(provider: QCommerceProvider, identifiers?: string[], prefix?: string, count?: number) {
    const normalized = (identifiers ?? []).map((id) => id.trim()).filter(Boolean);
    const desiredCount = count && count > 0 ? count : 10;
    const seedPrefix = (prefix ?? provider).trim() || provider;

    const generatedIds: string[] = [];
    const sourceIds = normalized.length
      ? normalized
      : Array.from({ length: desiredCount }, (_, i) => `${seedPrefix}_${i + 1}`);

    for (const identifier of sourceIds) {
      const internalDriverId = createInternalDriverId(provider, identifier);
      this.ensureDriverRecord(provider, identifier, internalDriverId);
      generatedIds.push(internalDriverId);
    }

    return {
      success: true,
      provider,
      seeded: generatedIds.length,
      driverIds: generatedIds,
    };
  }

  getZoneActivity(zone: string) {
    const rawZone = zone.trim();
    const zoneKey = rawZone.toLowerCase();
    const records = Array.from(this.driverRecords.values());

    if (!records.length) {
      this.seedDrivers(QCommerceProvider.ZEPTO, undefined, 'auto', 12);
      return this.getZoneActivity(zone);
    }

    const zoneLabel = (value?: string) =>
      (value ?? '').split(',')[0].trim().toLowerCase();

    const isH3Like = /^[0-9a-f]+$/i.test(zoneKey) && zoneKey.length >= 10;
    let mappedZone = zoneKey;
    if (isH3Like) {
      const allZones = Array.from(
        new Set(records.flatMap((r) => r.cityContext.serviceZones.map(zoneLabel))),
      );
      if (allZones.length) {
        let hash = 0;
        for (let i = 0; i < zoneKey.length; i += 1) {
          hash = (hash * 31 + zoneKey.charCodeAt(i)) % allZones.length;
        }
        mappedZone = allZones[hash];
      }
    }

    let activeRiders = 0;
    let activeOrders = 0;
    let totalDelayMinutes = 0;
    let delayCount = 0;
    let slaBreaches = 0;

    for (const record of records) {
      this.refreshWeekIfNeeded(record);
      const identity = record.staticProfile.identity;
      const driverZone = zoneLabel(identity.primaryServiceZone);

      if (identity.currentStatus === DriverStatus.ACTIVE && driverZone === mappedZone) {
        activeRiders += 1;
      }

      const history = record.currentSnapshot?.orderHistory ?? [];
      for (const order of history) {
        const pickupZone = zoneLabel(order.pickupZone);
        const deliveryZone = zoneLabel(order.deliveryZone);
        if (pickupZone !== mappedZone && deliveryZone !== mappedZone) {
          continue;
        }

        activeOrders += 1;

        if (order.assignedAt && order.deliveredAt) {
          const assigned = new Date(order.assignedAt).getTime();
          const delivered = new Date(order.deliveredAt).getTime();
          if (Number.isFinite(assigned) && Number.isFinite(delivered) && delivered >= assigned) {
            const delayMin = (delivered - assigned) / 60000;
            totalDelayMinutes += delayMin;
            delayCount += 1;
            if (delayMin > 30) {
              slaBreaches += 1;
            }
          }
        }
      }
    }

    const demandRatio = activeOrders / Math.max(activeRiders, 1);
    const avgDelay = delayCount ? totalDelayMinutes / delayCount : 0;
    const slaBreachRate = delayCount ? slaBreaches / delayCount : 0;

    const response: Record<string, unknown> = {
      zone,
      mapped_zone: mappedZone !== zoneKey ? mappedZone : undefined,
      active_riders: activeRiders,
      active_orders: activeOrders,
      demand_ratio: Number(demandRatio.toFixed(3)),
      order_density: Number((activeOrders / Math.max(activeRiders, 1)).toFixed(3)),
      sla_breach_rate: Number(slaBreachRate.toFixed(3)),
      avg_delivery_delay_min: Number(avgDelay.toFixed(2)),
      source: 'dynamic-qcommerce',
    };

    if (!response.mapped_zone) {
      delete response.mapped_zone;
    }

    return response;
  }

  publishLiveTelemetry(zone: string, provider: QCommerceProvider, count = 6) {
    const rawZone = zone.trim();
    const zoneKey = rawZone.toLowerCase();
    const isH3Like = /^[0-9a-f]+$/i.test(zoneKey) && zoneKey.length >= 10;
    const center = isH3Like ? h3.cellToLatLng(zoneKey) : [12.9716, 77.5946];
    const [baseLat, baseLng] = center as [number, number];

    if (!this.driverRecords.size) {
      this.seedDrivers(provider, undefined, 'auto', Math.max(12, count));
    }

    const driverIds = Array.from(this.driverRecords.values())
      .filter((record) => record.provider === provider)
      .map((record) => record.internalDriverId);

    const selected = driverIds.length ? driverIds.slice(0, count) : [];
    const timestamp = Math.floor(Date.now() / 1000);

    const published: string[] = [];
    for (const driverId of selected) {
      const prev = this.driverPositions.get(driverId);
      const jitterLat = (Math.random() - 0.5) * 0.002;
      const jitterLng = (Math.random() - 0.5) * 0.002;
      const nextLat = (prev?.lat ?? baseLat) + jitterLat;
      const nextLng = (prev?.lng ?? baseLng) + jitterLng;

      this.driverPositions.set(driverId, { lat: nextLat, lng: nextLng, timestamp });
      this.kafkaProducer.publishDriverLocation({
        driverId,
        lat: nextLat,
        lng: nextLng,
        timestamp,
        platform: provider,
      });
      published.push(driverId);
    }

    return {
      zone,
      provider,
      published: published.length,
      driverIds: published,
      base: { lat: baseLat, lng: baseLng },
    };
  }

  private ensureDriverRecord(
    provider: QCommerceProvider,
    identifier: string,
    internalDriverId?: string,
  ): DriverRecord {
    const driverId = internalDriverId ?? createInternalDriverId(provider, identifier);
    const existing = this.driverRecords.get(driverId);
    if (existing) {
      return existing;
    }

    const staticParts = buildStaticProfileParts(provider, identifier, driverId);
    const weekKey = this.resolveWeekKey();
    const weeklySnapshot = buildWeeklySnapshot(provider, identifier, weekKey, staticParts.cityContext);
    const record: DriverRecord = {
      provider,
      identifier,
      internalDriverId: driverId,
      staticProfile: staticParts.staticProfile,
      cityContext: staticParts.cityContext,
      currentWeekKey: weekKey,
      currentSnapshot: weeklySnapshot,
      previousWeeksHistory: [],
    };
    this.driverRecords.set(driverId, record);
    return record;
  }

  private refreshWeekIfNeeded(record: DriverRecord): boolean {
    const latestWeekKey = this.resolveWeekKey();
    if (record.currentWeekKey === latestWeekKey) {
      return false;
    }

    const previousWeekKey = record.currentWeekKey;
    this.archiveWeek(record);
    record.currentWeekKey = latestWeekKey;
    record.currentSnapshot = buildWeeklySnapshot(
      record.provider,
      record.identifier,
      latestWeekKey,
      record.cityContext,
    );
    this.logger.log(
      `Week rollover for driver ${record.internalDriverId}: ${previousWeekKey} -> ${latestWeekKey}`,
    );
    return true;
  }

  private archiveWeek(record: DriverRecord) {
    if (!record.currentSnapshot) {
      return;
    }
    const clonedWeek = this.cloneWeekSummary(record.currentSnapshot.currentWeek);
    record.previousWeeksHistory.unshift({
      weekKey: record.currentWeekKey,
      generatedAt: new Date(),
      weekSummary: clonedWeek,
    });
    record.previousWeeksHistory = record.previousWeeksHistory.slice(0, 4);
  }

  setWeekKeyOverride(weekKey?: string) {
    this.weekKeyOverride = weekKey?.trim() || undefined;
    if (this.weekKeyOverride) {
      this.logger.warn(`Dynamic Q-commerce week override set to ${this.weekKeyOverride}`);
    } else {
      this.logger.warn('Dynamic Q-commerce week override cleared');
    }
    return {
      success: true,
      weekKeyOverride: this.weekKeyOverride ?? null,
      message: this.weekKeyOverride
        ? `Week override active until cleared (using ${this.weekKeyOverride})`
        : 'Week override cleared; service now uses real-time ISO week',
    };
  }

  private resolveWeekKey(): string {
    return this.weekKeyOverride ?? getIsoWeekKey();
  }

  private composeProfile(record: DriverRecord): DriverProfilePayload {
    return {
      ...record.staticProfile,
      ...record.currentSnapshot,
      historicalWeeks: record.previousWeeksHistory.map<DriverHistoricalWeekSnapshot>((hist) => ({
        weekKey: hist.weekKey,
        generatedAt: hist.generatedAt.toISOString(),
        weekSummary: hist.weekSummary,
      })),
    };
  }

  private cloneWeekSummary(week: DriverWeekSummary): DriverWeekSummary {
    return {
      ...week,
      dailyBreakdown: week.dailyBreakdown.map((day) => ({
        ...day,
        darkStoresServed: [...day.darkStoresServed],
      })),
    };
  }
}
