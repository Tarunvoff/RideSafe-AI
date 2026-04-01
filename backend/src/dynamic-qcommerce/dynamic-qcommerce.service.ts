import { Injectable, Logger, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { DynamicOAuthLoginDto } from './dto/dynamic-oauth-login.dto';
import { DynamicOAuthCallbackDto } from './dto/dynamic-oauth-callback.dto';
import { QCommerceProvider } from './enums/qcommerce.enums';
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

@Injectable()
export class DynamicQCommerceService {
  private readonly logger = new Logger(DynamicQCommerceService.name);
  private readonly sessions = new Map<string, OAuthSessionState>();
  private readonly driverRecords = new Map<string, DriverRecord>();
  private weekKeyOverride?: string;

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
