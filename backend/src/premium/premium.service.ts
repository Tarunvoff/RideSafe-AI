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

@Injectable()
export class PremiumService {
  private readonly logger = new Logger(PremiumService.name);

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

  async calculateWeeklyPremium(driverId: string, planId?: string) {
    const profileDriverId = await this.resolveProfileDriverId(driverId);
    const profile = (await this.dynamicQCommerce.getDriverProfile(profileDriverId)).driverProfile;
    const activeDays = this.resolveActiveDays(profile);
    const Ew = this.resolveEarningsWithNewDriverFallback(profile, activeDays);

    const Ct = planId
      ? await this.resolveCtForPlanId(planId)
      : await this.resolveCtForDriver(driverId);
    if (Ct == null) {
      throw new Error('AEGIS_ERR_301: Unable to resolve policy tier for premium calculation');
    }

    let Lf = 0.5;
    const driverState = await this.redisState.getDriverState(profileDriverId);
    const h3Cell = driverState?.last_location?.h3_cell;
    if (!h3Cell) {
      this.logger.warn(`No driver h3 cell in Redis for ${profileDriverId}; using default Lf=${Lf}`);
    } else {
      const zoneState = await this.redisState.getZoneState(h3Cell);
      if (zoneState?.Lf != null || zoneState?.lf_score != null) {
        Lf = Number(zoneState?.Lf ?? zoneState?.lf_score);
      } else {
        this.logger.warn(`No zone Lf found for ${h3Cell}; using default Lf=${Lf}`);
      }
    }

    const rawPremium = computeRawWeeklyPremium({ Ew, Lf, Ct });
    const tierCap = this.resolveTierCap(Ct);
    const premium = applyPremiumBounds(rawPremium, tierCap);
    if (premium !== rawPremium) {
      this.logger.warn(
        `Weekly premium bounded for ${driverId}: raw=${rawPremium}, final=${premium}, cap=${tierCap}`,
      );
    }

    this.logger.log(
      `Weekly premium for ${driverId}: Ew=${Ew} Lf=${Lf.toFixed(3)} Ct=${Ct} premium=${premium}`,
    );

    return {
      driverId,
      Ew,
      Lf,
      Ct,
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
