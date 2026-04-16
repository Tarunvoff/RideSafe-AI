import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DynamicQCommerceService } from '../dynamic-qcommerce/dynamic-qcommerce.service';
import { RedisStateService } from '../state/redis-state.service';
import { ctForPlan } from '../insurance/policy-tiers';
import { QCommerceProvider } from '../dynamic-qcommerce/enums/qcommerce.enums';
import { createInternalDriverId } from '../dynamic-qcommerce/utils/dynamic-data.factory';
import {
  applyPremiumBounds,
  computeRawWeeklyPremium,
  resolveEarningsWithFallback,
  resolveTierCap,
  MINIMUM_WEEKLY_PREMIUM_INR,
} from './premium-calculation.util';

type RiskScoreResponse = {
  lf_score: number;
  zone_state: string;
  confidence: number;
  model_used: 'xgboost' | 'fallback';
};

@Injectable()
export class PremiumService {
  private readonly logger = new Logger(PremiumService.name);
  private readonly mlServiceUrl = process.env.ML_SERVICE_URL;

  constructor(
    private readonly prisma: PrismaService,
    private readonly dynamicQCommerce: DynamicQCommerceService,
    private readonly redisState: RedisStateService,
  ) {}

  private resolveCt(planKey?: string | null) {
    const Ct = ctForPlan(planKey ?? null);
    if (Ct == null) return null;
    return Ct;
  }

  private resolveActiveDays(profile: any): number {
    const daily = profile?.currentWeek?.dailyBreakdown ?? [];
    if (!Array.isArray(daily)) return 0;
    return daily.filter((day) => (day.hoursWorked ?? 0) > 0 || (day.completedDeliveries ?? 0) > 0).length;
  }

  private resolveWeeklyEarnings(profile: any): number {
    return (
      profile?.currentWeek?.weeklyEarningsTotal ??
      profile?.workSummary?.averageWeeklyEarnings ??
      0
    );
  }

  /**
   * Returns earnings baseline for low-history drivers where Ew is unstable or zero.
   */
  private resolveEarningsWithNewDriverFallback(profile: any, activeDays: number): number {
    const weekly = this.resolveWeeklyEarnings(profile);
    const cohortCandidate = Number(profile?.workSummary?.averageWeeklyEarnings ?? 0);
    const baseline = resolveEarningsWithFallback({
      weeklyEarnings: weekly,
      cohortAverageWeeklyEarnings: cohortCandidate,
      activeDays,
    });
    if (baseline !== weekly) {
      this.logger.warn(
        `New driver earnings fallback applied: active_days=${activeDays}, weekly=${weekly}, baseline=${baseline}`,
      );
    }
    return baseline;
  }

  private async resolveCtForDriver(driverId: string): Promise<number | null> {
    const now = new Date();
    const activePolicy = await this.prisma.policy.findFirst({
      where: {
        userId: driverId,
        status: 'ACTIVE',
        endDate: { gt: now },
      },
      include: { weeklyPlan: true },
      orderBy: { createdAt: 'desc' },
    });

    const planKey = activePolicy?.weeklyPlan?.key ?? activePolicy?.planType ?? null;
    return this.resolveCt(planKey);
  }

  private async resolveCtForPlanId(planId: string): Promise<number | null> {
    const plan = await this.prisma.weeklyPlan.findUnique({
      where: { id: planId },
      select: { key: true },
    });
    return this.resolveCt(plan?.key ?? null);
  }

  private resolveTierCap(Ct: number): number {
    return resolveTierCap(Ct);
  }

  private async resolveProfileDriverId(driverOrUserId: string): Promise<string> {
    try {
      await this.dynamicQCommerce.getDriverProfile(driverOrUserId);
      return driverOrUserId;
    } catch {
      // Fallback for app JWT user IDs: derive deterministic dynamic profile from user identity.
      const user = await this.prisma.user.findUnique({
        where: { id: driverOrUserId },
        select: { email: true, phone: true, platform: true },
      });

      const identifier = user?.email ?? user?.phone;
      if (!identifier) {
        throw new Error('Cannot resolve dynamic driver identifier from user account');
      }

      const rawPlatform = String(user?.platform ?? '').toLowerCase();
      const provider = (
        Object.values(QCommerceProvider) as string[]
      ).includes(rawPlatform)
        ? (rawPlatform as QCommerceProvider)
        : QCommerceProvider.BLINKIT;

      const derivedDriverId = createInternalDriverId(provider, identifier);
      await this.dynamicQCommerce.getDriverProfile(derivedDriverId);
      this.logger.warn(
        `Resolved dynamic driver profile via derived identifier for userId=${driverOrUserId} provider=${provider}`,
      );
      return derivedDriverId;
    }
  }

  private async resolveLfFromMlService(params: {
    h3Cell: string;
    historicalRisk: number;
  }): Promise<RiskScoreResponse> {
    const now = new Date();
    const payload = {
      h3_cell: params.h3Cell,
      rainfall_mm: 0,
      aqi: 80,
      demand_ratio: 1,
      hour_of_day: now.getUTCHours(),
      day_of_week: now.getUTCDay(),
      historical_risk: params.historicalRisk,
    };

    const res = await fetch(`${this.mlServiceUrl}/risk/score`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(5_000),
    });

    if (!res.ok) {
      throw new Error(`Risk ML service HTTP ${res.status}`);
    }

    const data = (await res.json()) as RiskScoreResponse;
    if (!Number.isFinite(data?.lf_score)) {
      throw new Error('Risk ML service returned invalid lf_score');
    }
    return data;
  }

  async calculateWeeklyPremium(driverId: string, planId?: string) {
    const profileDriverId = await this.resolveProfileDriverId(driverId);
    const profile = (await this.dynamicQCommerce.getDriverProfile(profileDriverId)).driverProfile;
    const activeDays = this.resolveActiveDays(profile);
    const Ew = this.resolveEarningsWithNewDriverFallback(profile, activeDays);

    const Ct = planId
      ? await this.resolveCtForPlanId(planId)
      : await this.resolveCtForDriver(driverId);
    
    if (Ct == null) {
      this.logger.warn(`AEGIS_ERR_301: Missing policy tier for ${driverId}; using safe default 0.5`);
    }

    const safeCt = Ct ?? 0.5;

    let Lf = 0;
    let modelUsed: 'redis' | 'xgboost' | 'fallback' = 'redis';
    const driverState = await this.redisState.getDriverState(profileDriverId);
    let h3Cell = driverState?.last_location?.h3_cell;

    if (!h3Cell) {
      // Fallback: Try to resolve H3 from KYC city if GPS is missing
      const kyc = await this.prisma.kYCPersonalDetails.findUnique({
        where: { userId: driverId },
        select: { city: true }
      });
      
      const cityToH3: Record<string, string> = {
        'chennai': '8861892433fffff',
        'bangalore': '8861892521fffff',
        'coimbatore': '8861892095fffff',
        'mumbai': '8860a25939fffff',
        'delhi': '883da11281fffff'
      };

      const normalizedCity = (kyc?.city ?? '').toLowerCase().trim();
      h3Cell = cityToH3[normalizedCity] ?? '8861892433fffff'; // Default to Chennai H3
      
      this.logger.warn(`AEGIS_ERR_001: Missing H3 cell for ${driverId}; using city-based fallback: ${normalizedCity} -> ${h3Cell}`);
    }

    {
      const zoneState = await this.redisState.getZoneState(h3Cell);
      if (zoneState?.Lf != null || zoneState?.lf_score != null) {
        Lf = Number(zoneState?.Lf ?? zoneState?.lf_score);
        modelUsed = 'redis';
      } else {
        const mlRisk = await this.resolveLfFromMlService({
          h3Cell,
          historicalRisk: 0.35,
        });

        Lf = Number(mlRisk.lf_score);
        modelUsed = mlRisk.model_used;
        await this.redisState.setZoneState(h3Cell, {
          Lf,
          zone_state: mlRisk.zone_state,
          confidence: mlRisk.confidence,
          model_used: mlRisk.model_used,
          computed_at: new Date().toISOString(),
        });

        this.logger.log(
          `Zone Lf cache miss resolved via ML: model_used=${mlRisk.model_used}, lf_score=${Lf.toFixed(4)}, h3_cell=${h3Cell}, driver_id=${profileDriverId}`,
        );
      }
    }

    const rawPremium = computeRawWeeklyPremium({ Ew, Lf, Ct: safeCt });
    const tierCap = this.resolveTierCap(safeCt);
    const premium = applyPremiumBounds(rawPremium, tierCap);
    if (premium !== rawPremium) {
      this.logger.warn(
        `Weekly premium bounded for ${driverId}: raw=${rawPremium}, final=${premium}, cap=${tierCap}`,
      );
    }

    this.logger.log(
      `Weekly premium for ${driverId}: Ew=${Ew} Lf=${Lf.toFixed(3)} Ct=${Ct} premium=${premium} model_used=${modelUsed} h3_cell=${h3Cell}`,
    );

    return {
      driverId,
      Ew,
      Lf,
      Ct: safeCt,
      active_days: activeDays,
      scaling_factor: 1,
      premium,
      bounds: {
        min: MINIMUM_WEEKLY_PREMIUM_INR,
        max: tierCap,
      },
    };
  }
}
