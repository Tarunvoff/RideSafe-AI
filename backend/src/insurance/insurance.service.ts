import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import * as h3 from 'h3-js';
import { PrismaService } from '../prisma/prisma.service';
import { DynamicQCommerceService } from '../dynamic-qcommerce/dynamic-qcommerce.service';
import { RedisStateService, PARAMETRIC_TRIGGER_STATES } from '../state/redis-state.service';
import { FraudIntegrationService } from '../fraud-integration/fraud-integration.service';
import { PayoutService } from '../payout/payout.service';
import { PremiumService } from '../premium/premium.service';
import { ProcessInsuranceRequestDto } from './dto/process-insurance.dto';
import { ctForPlan, normalizePlanTier } from './policy-tiers';
import { assertDriverPolicyEligibility } from '../compliance/driver-eligibility.util';

const H3_FEATURE_URL = process.env.H3_FEATURE_SERVICE_URL ?? 'http://localhost:8004';
const GRID_EVENT_URL = process.env.GRID_EVENT_SERVICE_URL ?? 'http://localhost:8003';
const FRAUD_BLOCK_THRESHOLD = Number(process.env.FRAUD_BLOCK_THRESHOLD ?? 0.7);

const PREMIUM_MARGIN = 0.1;
const PREMIUM_RATE = 0.015;

@Injectable()
export class InsuranceService {
  private readonly logger = new Logger(InsuranceService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly dynamicQCommerce: DynamicQCommerceService,
    private readonly redisState: RedisStateService,
    private readonly fraudIntegration: FraudIntegrationService,
    private readonly payoutService: PayoutService,
    private readonly premiumService: PremiumService,
  ) {}

  private resolveCtOrThrow(planKey?: string | null) {
    const Ct = ctForPlan(planKey ?? null);
    if (Ct == null) {
      throw new BadRequestException('Invalid plan tier');
    }
    return Ct;
  }

  private resolveWeeklyEarnings(profile: any): number {
    return (
      profile?.currentWeek?.weeklyEarningsTotal ??
      profile?.workSummary?.averageWeeklyEarnings ??
      0
    );
  }

  private computePremium(Ew: number, Lf: number, Ct: number) {
    const premium = Ew * PREMIUM_RATE * Lf * Ct * (1 + PREMIUM_MARGIN);
    return Math.round(premium * 100) / 100;
  }

  private resolveH3FromDriverState(driverState: Record<string, any> | null) {
    const lat = driverState?.last_location?.lat ?? null;
    const lng = driverState?.last_location?.lng ?? null;
    const h3Cell = driverState?.last_location?.h3_cell ?? null;

    if (h3Cell) {
      return { lat, lng, h3Cell };
    }

    if (lat != null && lng != null) {
      return { lat, lng, h3Cell: h3.latLngToCell(lat, lng, 8) };
    }

    return { lat, lng, h3Cell: null };
  }

  private async callPipeline(lat: number, lng: number, Ew: number, Ct: number, platform?: string | null) {
    const payload = {
      lat,
      lng,
      Ew,
      Ct,
      M: 0.1,
      platform: platform ?? undefined,
    };

    const resp = await fetch(`${H3_FEATURE_URL}/pipeline`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(4_000),
    });

    if (!resp.ok) {
      throw new Error(`h3 pipeline HTTP ${resp.status}`);
    }

    return resp.json();
  }

  private async fallbackZoneState(h3Cell: string) {
    const redisZone = await this.redisState.getZoneState(h3Cell);
    if (redisZone) return redisZone;

    try {
      const resp = await fetch(`${GRID_EVENT_URL}/zones/${h3Cell}`, {
        method: 'GET',
        signal: AbortSignal.timeout(2_000),
      });
      if (resp.ok) return resp.json();
    } catch (err) {
      this.logger.warn(`Grid event fallback failed: ${err}`);
    }

    return null;
  }

  async enrollPolicy(dto: { driverId: string; plan: string }) {
    const plan = normalizePlanTier(dto.plan);
    if (!plan) {
      throw new BadRequestException('Plan must be BASIC, STANDARD, or PREMIUM');
    }

    const existingUser = await this.prisma.user.findUnique({
      where: { id: dto.driverId },
    });

    if (!existingUser) {
      throw new BadRequestException('Driver account not found. Please register and complete onboarding first.');
    }

    await assertDriverPolicyEligibility(this.prisma, dto.driverId, plan);

    const profile = (await this.dynamicQCommerce.getDriverProfile(dto.driverId)).driverProfile;
    const Ew = this.resolveWeeklyEarnings(profile);
    const platform = profile?.identity?.provider ?? null;

    const driverState = await this.redisState.getDriverState(dto.driverId);
    const { lat, lng, h3Cell } = this.resolveH3FromDriverState(driverState);
    if (!h3Cell || lat == null || lng == null) {
      throw new BadRequestException('Driver location is required to assign a zone');
    }

    const Ct = this.resolveCtOrThrow(plan);
    let Lf = 0.5;
    let zoneState = 'UNKNOWN';
    let premiumFromPipeline: number | null = null;

    try {
      const pipeline = await this.callPipeline(lat, lng, Ew, Ct, platform);
      Lf = Number(pipeline?.Lf ?? Lf);
      zoneState = pipeline?.zone_state ?? zoneState;
      // Prefer Python pricing service result; fall through to local formula if absent
      if (pipeline?.premium != null && Number(pipeline.premium) > 0) {
        premiumFromPipeline = Number(pipeline.premium);
      }
    } catch (err) {
      this.logger.warn(`Pipeline unavailable for ${dto.driverId}: ${err}`);
      const fallbackZone = await this.fallbackZoneState(h3Cell);
      if (fallbackZone) {
        Lf = Number(fallbackZone?.Lf ?? fallbackZone?.lf_score ?? Lf);
        zoneState = fallbackZone?.zone_state ?? fallbackZone?.state ?? zoneState;
      }
    }

    // Use Python pricing if available, otherwise compute locally as safety net
    const premium = premiumFromPipeline ?? this.computePremium(Ew, Lf, Ct);
    const now = new Date();
    const validTo = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    await this.prisma.policy.updateMany({
      where: { userId: dto.driverId, status: 'ACTIVE', endDate: { gt: now } },
      data: { endDate: now },
    });

    const policy = await this.prisma.policy.create({
      data: {
        userId: dto.driverId,
        planType: plan,
        status: 'ACTIVE',
        premium,
        startDate: now,
        endDate: validTo,
      },
    });

    await this.redisState.setPolicyState(policy.id, {
      plan,
      Ct,
      Ew,
      Lf,
      premium,
      zone: h3Cell,
      zone_state: zoneState,
      active: true,
      updatedAt: new Date().toISOString(),
    });

    return {
      driverId: dto.driverId,
      plan,
      Ct,
      Ew,
      Lf,
      premium,
      zone: h3Cell,
      status: 'ACTIVE',
      validFrom: now,
      validTo,
    };
  }

  async processInsurance(driverId: string, dto: ProcessInsuranceRequestDto) {
    const profile = (await this.dynamicQCommerce.getDriverProfile(driverId)).driverProfile;
    const Ew = this.resolveWeeklyEarnings(profile);

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

    if (!activePolicy) {
      return {
        plan: null,
        Ct: null,
        premium: 0,
        payout: 0,
        decision: 'REJECT',
        transactionId: null,
      };
    }

    const planKey = activePolicy?.weeklyPlan?.key ?? activePolicy?.planType ?? null;

    await assertDriverPolicyEligibility(this.prisma, driverId, planKey);

    let Ct: number;
    try {
      Ct = this.resolveCtOrThrow(planKey);
    } catch (err) {
      return {
        plan: planKey,
        Ct: null,
        premium: activePolicy?.premium ?? 0,
        payout: 0,
        decision: 'REJECT',
        transactionId: null,
      };
    }

    const existingPolicyState = await this.redisState.getPolicyState(activePolicy.id) ?? {};
    await this.redisState.setPolicyState(activePolicy.id, {
      ...existingPolicyState,
      Ct,
      active: true,
      updatedAt: new Date().toISOString(),
    });

    let lat = dto.lat;
    let lng = dto.lng;
    let h3Cell: string | null = null;

    if (lat == null || lng == null) {
      const driverState = await this.redisState.getDriverState(driverId);
      lat = driverState?.last_location?.lat ?? lat;
      lng = driverState?.last_location?.lng ?? lng;
      h3Cell = driverState?.last_location?.h3_cell ?? null;
    }

    if (lat != null && lng != null) {
      h3Cell = h3.latLngToCell(lat, lng, 8);
    }

    let Lf = 0.5;
    let zoneState = 'UNKNOWN';

    if (h3Cell) {
      const zone = await this.redisState.getZoneState(h3Cell);
      if (zone) {
        Lf = Number(zone?.Lf ?? zone?.lf_score ?? Lf);
        zoneState = zone?.zone_state ?? zone?.state ?? zoneState;
      }
    }

    let fraudScore: number | null = null;
    let fraudSource = 'redis-fallback';
    let fraudFailure = false;

    try {
      if (lat != null && lng != null) {
        const fraudResult = await this.fraudIntegration.computeFraudScore(driverId, {
          gpsLatitude: lat,
          gpsLongitude: lng,
          deviceId: dto.deviceId,
          upiId: dto.upiId,
          claimAmount: dto.claimAmount,
          eventType: dto.eventType ?? 'TRIGGER_EVAL',
        });
        fraudScore = fraudResult.fraudScore;
        fraudSource = fraudResult.featureSource ?? 'ml-fraud-feature-service';
      } else {
        const driverState = await this.redisState.getDriverState(driverId);
        if (driverState?.fraudScore != null) {
          fraudScore = Number(driverState.fraudScore);
        }
      }
    } catch (err) {
      fraudFailure = true;
      this.logger.warn(`Fraud scoring failed for ${driverId}: ${err}`);
    }

    const trigger = PARAMETRIC_TRIGGER_STATES.includes(zoneState.toUpperCase());

    const eligible = Boolean(activePolicy);

    let payoutAmount = 0;
    let transactionId: string | null = null;
    let decision: 'APPROVED' | 'HOLD' | 'REJECT' | 'NO_TRIGGER' = 'HOLD';
    const eventTimestamp = dto.eventTimestamp ?? Math.floor(Date.now() / 1000);

    const policyState = await this.redisState.getPolicyState(activePolicy.id);
    const policyZone = policyState?.zone ?? null;

    if (!eligible) {
      decision = 'REJECT';
    } else if (!h3Cell) {
      decision = 'REJECT';
    } else if (!trigger) {
      decision = 'NO_TRIGGER';
    } else if (!policyZone || policyZone !== h3Cell) {
      decision = 'REJECT';
    } else if (fraudFailure || fraudScore == null) {
      decision = 'HOLD';
    } else if (fraudScore > FRAUD_BLOCK_THRESHOLD) {
      decision = 'REJECT';
    } else {
      const payoutCalc = await this.payoutService.calculatePayout({
        driverId,
        Ew,
        Lf,
        Ct,
      });
      payoutAmount = payoutCalc.payoutAmount;

      const payoutResult = await this.payoutService.processPayout({
        driverId,
        payoutAmount,
        h3Cell: h3Cell ?? undefined,
        eventTimestamp,
        policyId: activePolicy.id,
        disruptionType: zoneState,
      });

      if (payoutResult.success) {
        transactionId = payoutResult.transactionId ?? null;
        decision = 'APPROVED';
      } else {
        decision = 'HOLD';
      }
    }

    return {
      plan: planKey,
      Ct,
      premium: activePolicy?.premium ?? 0,
      payout: payoutAmount,
      decision,
      transactionId,
    };
  }

  async cancelPolicy(dto: { driverId: string; reason?: string }) {
    const activePolicy = await this.prisma.policy.findFirst({
      where: { userId: dto.driverId, status: 'ACTIVE', endDate: { gt: new Date() } },
    });

    if (!activePolicy) {
      throw new BadRequestException('No active policy found to cancel');
    }

    const now = new Date();
    await this.prisma.policy.update({
      where: { id: activePolicy.id },
      data: { status: 'CANCELLED', endDate: now },
    });

    await this.redisState.setPolicyState(activePolicy.id, {
      active: false,
      updatedAt: now.toISOString(),
      cancelReason: dto.reason ?? 'User initiated cancellation',
    });

    return { 
      success: true, 
      message: 'Policy cancelled successfully', 
      policyId: activePolicy.id, 
      cancelledAt: now 
    };
  }

  async renewPolicy(dto: { driverId: string }) {
    const latestPolicy = await this.prisma.policy.findFirst({
      where: { userId: dto.driverId },
      orderBy: { createdAt: 'desc' }
    });

    if (!latestPolicy) {
      throw new BadRequestException('No existing policy to renew. Please use /enroll.');
    }

    const now = new Date();
    // Allow renewal only if EXPIRED, CANCELLED, or within 24 hours of expiration
    if (latestPolicy.status === 'ACTIVE' && latestPolicy.endDate.getTime() > now.getTime() + 24 * 60 * 60 * 1000) {
      throw new BadRequestException('Current policy is active and not soon-to-expire. Cannot hold two active policies simultaneously.');
    }

    if (latestPolicy.weeklyPlanId) {
      const weeklyPlan = await this.prisma.weeklyPlan.findUnique({
        where: { id: latestPolicy.weeklyPlanId },
      });
      if (!weeklyPlan) {
        throw new BadRequestException('Weekly plan not found for renewal');
      }

      const premiumCalc = await this.premiumService.calculateWeeklyPremium(dto.driverId, weeklyPlan.id);
      const renewedPremium = Number(premiumCalc?.premium ?? latestPolicy.premium ?? weeklyPlan.price ?? 0);
      const renewStart = new Date();
      const renewEnd = new Date(renewStart.getTime() + weeklyPlan.durationDays * 24 * 60 * 60 * 1000);

      await this.prisma.policy.updateMany({
        where: { userId: dto.driverId, status: 'ACTIVE', endDate: { gt: renewStart } },
        data: { endDate: renewStart },
      });

      const renewedPolicy = await this.prisma.policy.create({
        data: {
          userId: dto.driverId,
          planType: weeklyPlan.key,
          status: 'ACTIVE',
          premium: renewedPremium,
          startDate: renewStart,
          endDate: renewEnd,
          weeklyPlanId: weeklyPlan.id,
        },
      });

      return {
        success: true,
        message: 'Policy renewed successfully',
        policyId: renewedPolicy.id,
        status: renewedPolicy.status,
        planType: renewedPolicy.planType,
        premium: renewedPolicy.premium,
        startDate: renewedPolicy.startDate,
        endDate: renewedPolicy.endDate,
      };
    }

    // Reuse enroll flow to create new policy, calculate dynamic premium, and terminate old policy safely
    return this.enrollPolicy({
      driverId: dto.driverId,
      plan: latestPolicy.planType
    });
  }

  async getPolicyStatus(driverId: string) {
    const policy = await this.prisma.policy.findFirst({
      where: { userId: driverId },
      orderBy: { createdAt: 'desc' },
      include: {
        payouts: true
      }
    });

    if (!policy) {
      throw new BadRequestException('No policy found for driver');
    }

    return {
      success: true,
      policyId: policy.id,
      status: policy.status,
      planType: policy.planType,
      premium: policy.premium,
      startDate: policy.startDate,
      endDate: policy.endDate,
      payoutHistory: policy.payouts
    };
  }
}
