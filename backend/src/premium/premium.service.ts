import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { randomUUID } from 'crypto';
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
  resolveTierFloor,
  MINIMUM_WEEKLY_PREMIUM_INR,
} from './premium-calculation.util';
import { LiquidityPoolService } from '../compliance/liquidity-pool.service';

type RiskScoreResponse = {
  lf_score: number;
  zone_state: string;
  confidence: number;
  model_used: 'xgboost' | 'fallback';
};

type ActivePolicyWithPlan = {
  id: string;
  userId: string;
  startDate: Date;
  endDate: Date;
  weeklyPlanId: string | null;
};

@Injectable()
export class PremiumService {
  private readonly logger = new Logger(PremiumService.name);
  private readonly mlServiceUrl = process.env.ML_SERVICE_URL ?? 'http://localhost:8000';

  constructor(
    private readonly prisma: PrismaService,
    private readonly dynamicQCommerce: DynamicQCommerceService,
    private readonly redisState: RedisStateService,
    private readonly liquidityPool: LiquidityPoolService,
  ) {}

  private async withRetry<T>(operation: () => Promise<T>, retries = 2): Promise<T> {
    let lastError: unknown = null;
    for (let attempt = 1; attempt <= retries + 1; attempt += 1) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        if (attempt > retries) break;
        this.logger.warn(`Recurring billing transient failure at attempt ${attempt}; retrying`);
      }
    }
    throw lastError;
  }

  private resolveCycleWindow(policyStartDate: Date, now: Date) {
    const elapsedMs = Math.max(0, now.getTime() - policyStartDate.getTime());
    const cycleIndex = Math.floor(elapsedMs / (7 * 24 * 60 * 60 * 1000));
    const billingCycleStart = new Date(policyStartDate.getTime() + cycleIndex * 7 * 24 * 60 * 60 * 1000);
    const billingCycleEnd = new Date(billingCycleStart.getTime() + 7 * 24 * 60 * 60 * 1000);
    return { billingCycleStart, billingCycleEnd };
  }

  private async ensureBillingMandate(policy: ActivePolicyWithPlan, now: Date) {
    const existing = await this.prisma.billingMandate.findFirst({
      where: { policyId: policy.id, status: { in: ['ACTIVE', 'PAUSED', 'FAILED'] } },
      orderBy: { createdAt: 'desc' },
    });
    if (existing) return existing;

    return this.prisma.billingMandate.create({
      data: {
        userId: policy.userId,
        policyId: policy.id,
        status: 'ACTIVE',
        nextChargeAt: now,
      },
    });
  }

  private async ensureCycleInvoice(params: {
    policy: ActivePolicyWithPlan;
    mandateId: string;
    now: Date;
    correlationId: string;
  }) {
    const { policy, mandateId, now, correlationId } = params;
    const { billingCycleStart, billingCycleEnd } = this.resolveCycleWindow(policy.startDate, now);

    const existing = await this.prisma.premiumInvoice.findUnique({
      where: {
        policyId_billingCycleStart: {
          policyId: policy.id,
          billingCycleStart,
        },
      },
    });
    if (existing) return existing;

    const premium = await this.calculateWeeklyPremium(policy.userId, policy.weeklyPlanId ?? undefined);

    return this.prisma.premiumInvoice.create({
      data: {
        userId: policy.userId,
        policyId: policy.id,
        mandateId,
        billingCycleStart,
        billingCycleEnd,
        amountDue: premium.premium,
        status: 'PENDING',
        dueAt: now,
        correlationId,
        metadata: {
          inputs: {
            Ew: premium.Ew,
            Lf: premium.Lf,
            Ct: premium.Ct,
            active_days: premium.active_days,
          },
          bounds: premium.bounds,
        },
      },
    });
  }

  private async executeRecurringDebit(params: {
    invoice: any;
    amountRupees: number;
    correlationId: string;
    attemptNumber: number;
  }) {
    const { invoice, amountRupees, correlationId, attemptNumber } = params;
    const gatewayUrl = process.env.RECURRING_BILLING_DEBIT_WEBHOOK_URL;
    const gatewayToken = process.env.RECURRING_BILLING_DEBIT_WEBHOOK_TOKEN;
    const allowStagedProvisioning = (process.env.ELITE_RECURRING_BILLING_ALLOW_STAGED ?? 'true').toLowerCase() === 'true';

    if (gatewayUrl) {
      if (!invoice.mandate?.providerMandateId) {
        throw new Error('Recurring billing mandate provider id is missing for live debit');
      }

      const response = await this.withRetry(
        () =>
          fetch(gatewayUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(gatewayToken ? { 'x-aegis-recurring-token': gatewayToken } : {}),
            },
            body: JSON.stringify({
              invoiceId: invoice.id,
              userId: invoice.userId,
              policyId: invoice.policyId,
              mandateId: invoice.mandateId,
              provider: invoice.mandate?.provider ?? 'RAZORPAY',
              providerMandateId: invoice.mandate?.providerMandateId,
              amountRupees,
              amountPaise: Math.round(amountRupees * 100),
              currency: 'INR',
              attemptNumber,
              correlationId,
            }),
          }),
        2,
      );

      if (!response.ok) {
        const body = await response.text();
        throw new Error(`Recurring billing gateway failed (${response.status}): ${body}`);
      }

      const data = await response.json().catch(() => ({} as any));
      const gatewayReference =
        data?.gatewayReference ?? data?.referenceId ?? data?.transactionId ?? data?.id ?? `rec_live_${Date.now()}`;

      return {
        isProvisioned: false,
        gatewayReference,
      };
    }


    if (!allowStagedProvisioning) {
      throw new Error('Recurring billing mandate debit integration is not configured');
    }

    return {
      isProvisioned: true,
      gatewayReference: `rec_bill_${Date.now()}_${attemptNumber}`,
    };
  }

  private async processInvoiceCharge(invoiceId: string, correlationId: string) {
    const invoice = await this.prisma.premiumInvoice.findUnique({
      where: { id: invoiceId },
      include: { mandate: true },
    });
    if (!invoice) {
      this.logger.warn(`cid=${correlationId} recurring charge skipped: invoice missing (${invoiceId})`);
      return;
    }
    if (invoice.status === 'PAID' || invoice.status === 'WAIVED') return;

    const attemptNumber = (await this.prisma.premiumChargeAttempt.count({ where: { invoiceId } })) + 1;
    const attempt = await this.prisma.premiumChargeAttempt.create({
      data: {
        invoiceId,
        attemptNumber,
        status: 'STARTED',
        correlationId,
      },
    });

    await this.prisma.premiumInvoice.update({
      where: { id: invoiceId },
      data: { status: 'PROCESSING', correlationId },
    });

    try {
      const debit = await this.executeRecurringDebit({
        invoice,
        amountRupees: invoice.amountDue,
        correlationId,
        attemptNumber: attempt.attemptNumber,
      });

      await this.prisma.$transaction(async (tx) => {
        await tx.premiumChargeAttempt.update({
          where: { id: attempt.id },
          data: {
            status: 'SUCCESS',
            gatewayReference: debit.gatewayReference,
            metadata: {
              isProvisioned: debit.isProvisioned,
            },
          },
        });

        await tx.premiumInvoice.update({
          where: { id: invoiceId },
          data: {
            status: 'PAID',
            amountPaid: invoice.amountDue,
            paidAt: new Date(),
            failureReason: null,
          },
        });

        await tx.premiumLedgerEntry.create({
          data: {
            userId: invoice.userId,
            policyId: invoice.policyId,
            invoiceId,
            direction: 'CREDIT',
            amount: invoice.amountDue,
            description: `Recurring premium for cycle ${invoice.billingCycleStart.toISOString()}`,
            correlationId,
          },
        });

        if (invoice.mandateId) {
          await tx.billingMandate.update({
            where: { id: invoice.mandateId },
            data: {
              status: 'ACTIVE',
              lastChargedAt: new Date(),
              nextChargeAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
              failureCount: 0,
            },
          });
        }

        // Unique Implementation: Actuarial Pool Replenishment
        // Recurring premiums are automatically stratified to ensure 
        // the platform's long-term liquidity and payout capability.
        await this.liquidityPool.injectPremium(invoice.amountDue, correlationId);
      });

      this.logger.log(`cid=${correlationId} recurring premium collected invoice=${invoiceId}`);
    } catch (error: any) {
      await this.prisma.$transaction(async (tx) => {
        await tx.premiumChargeAttempt.update({
          where: { id: attempt.id },
          data: {
            status: 'FAILED',
            errorCode: 'RECURRING_CHARGE_FAILED',
            errorMessage: error?.message ?? 'Unknown recurring billing error',
          },
        });

        await tx.premiumInvoice.update({
          where: { id: invoiceId },
          data: {
            status: 'FAILED',
            failureReason: error?.message ?? 'Unknown recurring billing error',
            correlationId,
          },
        });

        if (invoice.mandateId) {
          await tx.billingMandate.update({
            where: { id: invoice.mandateId },
            data: {
              status: 'FAILED',
              failureCount: { increment: 1 },
              nextChargeAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
            },
          });
        }
      });

      this.logger.error(
        `cid=${correlationId} recurring premium charge failed invoice=${invoiceId} reason=${error?.message ?? error}`,
      );
    }
  }

  @Cron(CronExpression.EVERY_HOUR)
  async runRecurringBilling() {
    const correlationId = `recurring_${randomUUID()}`;
    const now = new Date();

    const policies = await this.prisma.policy.findMany({
      where: {
        status: 'ACTIVE',
        startDate: { lte: now },
        endDate: { gt: now },
      },
      select: {
        id: true,
        userId: true,
        startDate: true,
        endDate: true,
        weeklyPlanId: true,
      },
    });

    let successCount = 0;
    let failedCount = 0;

    for (const policy of policies) {
      try {
        const mandate = await this.ensureBillingMandate(policy, now);
        if (mandate.status !== 'ACTIVE') {
          this.logger.warn(`cid=${correlationId} recurring billing skipped inactive mandate policy=${policy.id}`);
          continue;
        }
        if (mandate.nextChargeAt > now) continue;

        const invoice = await this.ensureCycleInvoice({
          policy,
          mandateId: mandate.id,
          now,
          correlationId,
        });

        if (invoice.status === 'PAID' || invoice.status === 'WAIVED') {
          successCount += 1;
          continue;
        }

        await this.processInvoiceCharge(invoice.id, correlationId);
        successCount += 1;
      } catch (error: any) {
        failedCount += 1;
        this.logger.error(
          `cid=${correlationId} recurring billing failed for policy=${policy.id} reason=${error?.message ?? error}`,
        );
      }
    }

    this.logger.log(
      `cid=${correlationId} recurring billing run complete policies=${policies.length} success=${successCount} failed=${failedCount}`,
    );
  }

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

    try {
      const res = await fetch(`${this.mlServiceUrl}/risk/score`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(2_000), // Fast 2s timeout
      });

      if (!res.ok) {
        throw new Error(`Risk ML service HTTP ${res.status}`);
      }

      const data = (await res.json()) as RiskScoreResponse;
      if (!Number.isFinite(data?.lf_score)) {
        throw new Error('Risk ML service returned invalid lf_score');
      }
      return data;
    } catch (err) {
      this.logger.warn(`ML Service unavailable or timed out, returning fallback Lf. Error: ${String(err)}`);
      
      let fallbackLf = 0.15;
      try {
        const settings = await this.prisma.adminSettings.findFirst();
        if (settings?.riskConfig) {
          const config = settings.riskConfig as any;
          if (config.fallbackLf != null) {
            fallbackLf = Number(config.fallbackLf);
          }
        }
      } catch (dbErr) {
        this.logger.error(`Failed to fetch fallback Lf from DB: ${dbErr}`);
      }

      return {
        lf_score: fallbackLf,
        zone_state: 'UNKNOWN',
        confidence: 0,
        model_used: 'fallback',
      };
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
      this.logger.warn(`AEGIS_ERR_301: Missing policy tier for ${driverId}; using safe default 0.5`);
    }

    let safeCt = Ct ?? 0.5;

    // DevTrails Rule: Workers with < 5 active days in 30 -> lower tier (BASIC coverage Ct=0.4)
    if (activeDays < 5) {
      this.logger.warn(`Driver ${driverId} has < 5 active days (${activeDays}). Forcing lower coverage tier (0.4).`);
      safeCt = 0.4;
    }

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
    const tierFloor = resolveTierFloor(safeCt);
    const premium = applyPremiumBounds(rawPremium, tierCap, tierFloor);
    if (premium !== rawPremium) {
      this.logger.warn(
        `Weekly premium bounded for ${driverId}: raw=${rawPremium}, final=${premium}, cap=${tierCap}, floor=${tierFloor}`,
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
        min: tierFloor,
        max: tierCap,
      },
    };
  }
}
