import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
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
const PAYOUT_RETRY_MAX_ATTEMPTS = Number(process.env.PAYOUT_RETRY_MAX_ATTEMPTS ?? 5);
const PAYOUT_RETRY_BATCH_SIZE = Number(process.env.PAYOUT_RETRY_BATCH_SIZE ?? 25);

/**
 * ── ACID-Compliant Financial Settlement Core ──────────────────────────────────
 * 
 * The PayoutService manages the platform's high-fidelity settlement pipeline. 
 * It ensures idempotent, exactly-once disbursements by orchestrating 
 * cryptographic triggers and resilient reconciliation loops.
 * 
 * For global settlement standards, refer to:
 * - ARCHITECTURE/ACTUARIAL_AND_PAYOUT_LOGIC.md
 * - ARCHITECTURE/COMPLIANCE_AND_LEGAL_FRAMEWORK.md
 */
@Injectable()
export class PayoutService {
  private readonly logger = new Logger('SovereignSettlement');

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

    // ── Idempotent Disruption Event Identification ─────────────────────────────
    // Instead of creating a new event for every request, we look for a canonical 
    // event within a 1-hour window to maintain strict event-scoped idempotency.
    let disruption = await this.prisma.disruptionEvent.findFirst({
      where: {
        type: params.disruptionType ?? 'SOVEREIGN_PARAMETRIC_TRIGGER',
        occurredAt: { gte: new Date(Date.now() - 3600 * 1000) },
      },
      orderBy: { occurredAt: 'desc' },
    });

    if (!disruption) {
      disruption = await this.prisma.disruptionEvent.create({
        data: {
          type: params.disruptionType ?? 'SOVEREIGN_PARAMETRIC_TRIGGER',
          title: 'Sovereign Parametric Settlement Event',
          expectedLoss: params.payoutAmount ?? 0,
          expectedPayout: params.payoutAmount ?? 0,
          occurredAt: now,
          verified: true,
        },
      });
    }

    // ── High-Fidelity Event-Scoped Pre-check ──────────────────────────────
    // Replace legacy driver-level lookup with strict {policyId, disruptionEventId} 
    // verification as identified in Finding #1.
    const existingPayout = await this.prisma.payout.findUnique({
      where: {
        policyId_disruptionEventId: {
          policyId: policy.id,
          disruptionEventId: disruption.id,
        },
      },
    });

    if (existingPayout) {
      this.logger.log(`Found existing settlement for event ${disruption.id} / policy ${policy.id} — returning cached success.`);
      return {
        success: true,
        cached: true,
        payoutId: existingPayout.id,
        transactionId: existingPayout.transactionId ?? null,
        grossAmount: params.payoutAmount ?? 0,
        netAmount: Number(existingPayout.approvedPayout ?? 0),
      };
    }

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
        transferRail: payoutResult.transferRail ?? null,
        transferReference: payoutResult.transferReference ?? null,
      };
    } catch (err) {
      this.logger.error(
        JSON.stringify({
          event: 'forensic_settlement_anomaly_detected',
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

  /**
   * ── Resilient Settlement Reconciliation Logic ───────────────────────────────
   * 
   * A high-order background process that ensures zero-loss continuity by 
   * re-triggering failed financial transfers with exponential precision.
   */
  @Cron('0 */2 * * * *')
  async processPayoutRetryQueue() {
    let processed = 0;

    while (processed < PAYOUT_RETRY_BATCH_SIZE) {
      const entry = await this.redisState.popPayoutRetry();
      if (!entry) break;

      processed += 1;
      const attempts = Number(entry.attempts ?? 0) + 1;

      try {
        await this.payments.processParametricPayout({
          userId: entry.driverId,
          policyId: entry.policyId,
          disruptionEventId: entry.disruptionEventId,
          eventTimestamp: Number(entry.eventTimestamp ?? Math.floor(Date.now() / 1000)),
          h3Cell: String(entry.h3Cell),
          approvedPayout: Number(entry.approvedPayout ?? 0),
          correlationId: `retry_${Date.now()}_${processed}`,
        });
      } catch (err: any) {
        if (attempts >= PAYOUT_RETRY_MAX_ATTEMPTS) {
          await this.prisma.kafkaDLQ.create({
            data: {
              topic: 'PAYOUT_RETRY_EXHAUSTED',
              eventKey: entry.driverId,
              payload: JSON.stringify({
                ...entry,
                attempts,
                exhaustedAt: new Date().toISOString(),
              }),
              error: err?.message ?? String(err),
              status: 'DEAD',
              retryCount: attempts,
            },
          });
          this.logger.error(
            `Payout retry exhausted for driver=${entry.driverId} disruption=${entry.disruptionEventId} attempts=${attempts}`,
          );
        } else {
          await this.redisState.pushPayoutRetry({
            ...entry,
            attempts,
            lastError: err?.message ?? String(err),
            lastRetryAt: new Date().toISOString(),
          });
        }
      }
    }

    if (processed > 0) {
      this.logger.log(`Processed payout retry queue batch size=${processed}`);
    }
  }
}
