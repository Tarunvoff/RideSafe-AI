import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DynamicQCommerceService } from '../dynamic-qcommerce/dynamic-qcommerce.service';
import { RedisStateService } from '../state/redis-state.service';
import { ctForPlan } from '../insurance/policy-tiers';

const PREMIUM_MARGIN = 0.1;
const PREMIUM_RATE = 0.015;

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

  async calculateWeeklyPremium(driverId: string) {
    const profile = (await this.dynamicQCommerce.getDriverProfile(driverId)).driverProfile;
    const Ew = this.resolveWeeklyEarnings(profile);
    const activeDays = this.resolveActiveDays(profile);

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
    const Ct = this.resolveCt(planKey);
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
    const driverState = await this.redisState.getDriverState(driverId);
    const h3Cell = driverState?.last_location?.h3_cell;
    if (h3Cell) {
      const zoneState = await this.redisState.getZoneState(h3Cell);
      if (zoneState?.Lf != null || zoneState?.lf_score != null) {
        Lf = Number(zoneState?.Lf ?? zoneState?.lf_score);
      }
    }

    let premium = Ew * PREMIUM_RATE * Lf * Ct * (1 + PREMIUM_MARGIN);
    premium = Math.round(premium * 100) / 100;

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
        max: 0,
      },
    };
  }
}
