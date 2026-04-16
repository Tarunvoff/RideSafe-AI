import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentsService } from '../payments/payments.service';
import { RedisStateService } from '../state/redis-state.service';
import { DynamicQCommerceService } from '../dynamic-qcommerce/dynamic-qcommerce.service';
import { ctForPlan } from '../insurance/policy-tiers';
import {
  computeGrossPayout,
  computeNetPayout,
  resolveDeductible,
} from './payout-calculation.util';
import { assertDriverPolicyEligibility } from '../compliance/driver-eligibility.util';

const AEGIS_ERR_POLICY_NOT_FOUND = 'AEGIS_ERR_201';
const AEGIS_ERR_INVALID_PLAN = 'AEGIS_ERR_202';
const AEGIS_ERR_ZONE_MISMATCH = 'AEGIS_ERR_203';
const AEGIS_ERR_ZONE_NOT_HALTED = 'AEGIS_ERR_204';
const AEGIS_ERR_H3_MISSING = 'AEGIS_ERR_205';

@Injectable()
export class PayoutService {
  private readonly logger = new Logger(PayoutService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly payments: PaymentsService,
    private readonly redisState: RedisStateService,
    private readonly dynamicQCommerce: DynamicQCommerceService,
  ) {}

  /**
   * Resolve deductible amount by plan tier.
   */
  private resolveDeductible(planType?: string | null): number {
    return resolveDeductible(planType);
  }

  /**
   * Applies deductible and guarantees non-negative payout.
   */
  private applyDeductible(grossPayout: number, deductible: number): number {
    return computeNetPayout(grossPayout, deductible);
  }

  /**
   * Calculate parametric payout from earnings, loss fraction, and plan tier.
   */
  async calculatePayout(params: { driverId: string; Ew?: number; Lf?: number; Ct?: number }) {
    let Ew = params.Ew ?? 0;
    let Lf = params.Lf ?? 0;
    let Ct = 0;

    const policy = await this.prisma.policy.findFirst({
      where: { 
        userId: params.driverId, 
        status: 'ACTIVE', 
        startDate: { lte: new Date() },
        endDate: { gt: new Date() } 
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!policy) {
      throw new NotFoundException({ code: AEGIS_ERR_POLICY_NOT_FOUND, message: 'Active policy not found for payout' });
    }

    const resolved = ctForPlan(policy.planType ?? null);
    if (resolved == null) {
      throw new BadRequestException({ code: AEGIS_ERR_INVALID_PLAN, message: 'Invalid plan tier for payout' });
    }
    Ct = resolved;

    if (!Ew) {
      const profile = (await this.dynamicQCommerce.getDriverProfile(params.driverId)).driverProfile;
      Ew = profile?.currentWeek?.weeklyEarningsTotal ?? 0;
    }

    if (!Lf) {
      const driverState = await this.redisState.getDriverState(params.driverId);
      const h3Cell = driverState?.last_location?.h3_cell;
      if (h3Cell) {
        const zoneState = await this.redisState.getZoneState(h3Cell);
        Lf = Number(zoneState?.Lf ?? zoneState?.lf_score ?? 0.5);
      } else {
        Lf = 0.5;
      }
    }

    const dailyIncome = Ew / 7;
    const grossPayout = computeGrossPayout({ Ew, Lf, Ct });
    const deductible = this.resolveDeductible(policy.planType);
    const payout = this.applyDeductible(grossPayout, deductible);

    return {
      driverId: params.driverId,
      Ew,
      Lf,
      Ct,
      deductible,
      daily_income: Number(dailyIncome.toFixed(2)),
      grossPayoutAmount: Number(grossPayout.toFixed(2)),
      payoutAmount: Number(payout.toFixed(2)),
    };
  }

  /**
   * Validate trigger state and process idempotent payout transfer.
   */
  async processPayout(params: {
    driverId: string;
    payoutAmount?: number;
    h3Cell?: string;
    eventTimestamp?: number;
    policyId?: string;
    disruptionType?: string;
  }) {
    const now = new Date();
    const eventTimestamp = params.eventTimestamp ?? Math.floor(Date.now() / 1000);

    const policy = params.policyId
      ? await this.prisma.policy.findUnique({ where: { id: params.policyId } })
      : await this.prisma.policy.findFirst({
          where: {
            userId: params.driverId,
            status: 'ACTIVE',
            startDate: { lte: now },
            endDate: { gt: now },
          },
          orderBy: { createdAt: 'desc' },
        });

    if (!policy) {
      throw new NotFoundException({ code: AEGIS_ERR_POLICY_NOT_FOUND, message: 'Active policy not found' });
    }
    
    // Check if the explicitly provided policy is within lockout/cooling-off period (P-014)
    if (params.policyId && policy.startDate > now) {
      throw new NotFoundException({ code: AEGIS_ERR_POLICY_NOT_FOUND, message: 'Policy is in cooling-off period' });
    }

    if (policy.userId !== params.driverId) {
      throw new BadRequestException('Policy does not belong to driver');
    }

    if (policy.status !== 'ACTIVE' || policy.endDate <= now) {
      throw new BadRequestException('Policy is not active');
    }

    await assertDriverPolicyEligibility(this.prisma, params.driverId, policy.planType);

    const h3Cell = params.h3Cell ?? (await this.redisState.getDriverState(params.driverId))?.last_location?.h3_cell;
    if (!h3Cell) {
      throw new NotFoundException({ code: AEGIS_ERR_H3_MISSING, message: 'Missing H3 cell for payout' });
    }

    const policyState = await this.redisState.getPolicyState(policy.id);
    const policyZone = policyState?.zone ?? null;
    if (!policyZone) {
      throw new BadRequestException('Policy zone not set');
    }

    if (policyZone !== h3Cell) {
      throw new BadRequestException({ code: AEGIS_ERR_ZONE_MISMATCH, message: 'Policy zone mismatch' });
    }

    const zoneState = await this.redisState.getZoneState(h3Cell);
    const zoneLabel = zoneState?.zone_state ?? zoneState?.state ?? 'UNKNOWN';
    if (zoneLabel !== 'HALTED') {
      throw new BadRequestException({ code: AEGIS_ERR_ZONE_NOT_HALTED, message: 'Zone is not halted' });
    }

    const existingPayout = await this.prisma.payout.findFirst({
      where: {
        policy: { userId: params.driverId },
      },
      orderBy: { createdAt: 'desc' },
    });
    if (existingPayout) {
      return {
        success: true,
        cached: true,
        payoutId: existingPayout.id,
        transactionId: existingPayout.transactionId ?? null,
      };
    }

    const disruption = await this.prisma.disruptionEvent.create({
      data: {
        type: params.disruptionType ?? 'PARAMETRIC_TRIGGER',
        title: 'Parametric Trigger Event',
        expectedLoss: params.payoutAmount ?? 0,
        expectedPayout: params.payoutAmount ?? 0,
        occurredAt: now,
        verified: true,
      },
    });

    const deductible = this.resolveDeductible(policy.planType);
    const grossAmount = params.payoutAmount ?? 0;
    const netAmount = this.applyDeductible(grossAmount, deductible);

    try {
      const payoutResult = await this.payments.processParametricPayout({
        userId: params.driverId,
        policyId: policy.id,
        disruptionEventId: disruption.id,
        eventTimestamp,
        h3Cell,
        approvedPayout: netAmount,
      });

      return {
        success: true,
        deductibleApplied: deductible,
        grossAmount,
        netAmount,
        payoutId: payoutResult.payoutId,
        transactionId: payoutResult.transactionId ?? null,
        cached: payoutResult.cached ?? false,
      };
    } catch (err) {
      this.logger.error(
        JSON.stringify({
          event: 'payout_processing_failed',
          driver_id: params.driverId,
          policy_id: policy.id,
          event_type: params.disruptionType ?? 'PARAMETRIC_TRIGGER',
          h3_cell: h3Cell,
          error: String(err),
        }),
      );
      await this.redisState.pushPayoutRetry({
        driverId: params.driverId,
        policyId: policy.id,
        disruptionEventId: disruption.id,
        h3Cell,
        approvedPayout: netAmount,
        eventTimestamp,
        reason: String(err),
        createdAt: new Date().toISOString(),
      });
      return {
        success: false,
        retryQueued: true,
      };
    }
  }

  async listPayouts(driverId: string) {
    const payouts = await this.prisma.payout.findMany({
      where: { policy: { userId: driverId } },
      include: { disruptionEvent: true },
      orderBy: { createdAt: 'desc' },
    });

    return payouts.map((p) => ({
      payoutId: p.id,
      amount: p.approvedPayout ?? p.estimatedLoss ?? 0,
      status: p.status,
      transactionId: p.transactionId ?? null,
      createdAt: p.createdAt,
    }));
  }

  async listClaims(driverId: string) {
    const payouts = await this.prisma.payout.findMany({
      where: { policy: { userId: driverId } },
      include: { disruptionEvent: true },
      orderBy: { createdAt: 'desc' },
    });

    return payouts.map((p) => ({
      claimId: p.id,
      status: p.status,
      amount: p.approvedPayout ?? p.estimatedLoss ?? 0,
      trigger: p.disruptionEvent?.type ?? 'UNKNOWN',
      createdAt: p.createdAt,
    }));
  }
}
