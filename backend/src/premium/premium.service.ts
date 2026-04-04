import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DynamicQCommerceService } from '../dynamic-qcommerce/dynamic-qcommerce.service';
import { RedisStateService } from '../state/redis-state.service';
import { ctForPlan } from '../insurance/policy-tiers';
import { QCommerceProvider } from '../dynamic-qcommerce/enums/qcommerce.enums';
import { createInternalDriverId } from '../dynamic-qcommerce/utils/dynamic-data.factory';

const PREMIUM_MARGIN = 0.1;
const PREMIUM_RATE = 0.015;
const MAX_WEEKLY_PREMIUM_INR = 50;

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

  private async resolveCtForDriver(driverId: string): Promise<number | null> {
    const now = new Date();
    const activePolicy = await (this.prisma as any).policy.findFirst({
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
    const plan = await (this.prisma as any).weeklyPlan.findUnique({
      where: { id: planId },
      select: { key: true },
    });
    return this.resolveCt(plan?.key ?? null);
  }

  private resolveTierCap(Ct: number): number {
    // Keep all plans <= ₹50 while preserving plan-level differentiation.
    const cap = 30 + Ct * 25; // BASIC(0.4)=40, STANDARD(0.6)=45, PREMIUM(0.8)=50
    return Math.min(MAX_WEEKLY_PREMIUM_INR, Math.round(cap * 100) / 100);
  }

  private async resolveProfileDriverId(driverOrUserId: string): Promise<string> {
    try {
      await this.dynamicQCommerce.getDriverProfile(driverOrUserId);
      return driverOrUserId;
    } catch {
      // Fallback for app JWT user IDs: derive deterministic dynamic profile from user identity.
      const user = await (this.prisma as any).user.findUnique({
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
    const Ew = this.resolveWeeklyEarnings(profile);
    const activeDays = this.resolveActiveDays(profile);

    const Ct = planId
      ? await this.resolveCtForPlanId(planId)
      : await this.resolveCtForDriver(driverId);
    if (Ct == null) {
      return {
        driverId,
        Ew,
        Lf: 0,
        Ct: null,
        active_days: activeDays,
        scaling_factor: 0,
        premium: 0,
        bounds: {
          min: 0,
          max: 0,
        },
      };
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

    let premium = Ew * PREMIUM_RATE * Lf * Ct * (1 + PREMIUM_MARGIN);
    premium = Math.round(premium * 100) / 100;
    const tierCap = this.resolveTierCap(Ct);
    if (premium > tierCap) {
      this.logger.warn(
        `Weekly premium exceeded tier cap for ${driverId}: computed=${premium}, capped=${tierCap}`,
      );
      premium = tierCap;
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
        min: 0,
        max: tierCap,
      },
    };
  }
}
