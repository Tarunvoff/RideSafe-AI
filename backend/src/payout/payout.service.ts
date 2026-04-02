import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentsService } from '../payments/payments.service';
import { RedisStateService } from '../state/redis-state.service';
import { DynamicQCommerceService } from '../dynamic-qcommerce/dynamic-qcommerce.service';
import { ctForPlan } from '../insurance/policy-tiers';

@Injectable()
export class PayoutService {
  private readonly logger = new Logger(PayoutService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly payments: PaymentsService,
    private readonly redisState: RedisStateService,
    private readonly dynamicQCommerce: DynamicQCommerceService,
  ) {}

  async calculatePayout(params: { driverId: string; Ew?: number; Lf?: number; Ct?: number }) {
    let Ew = params.Ew ?? 0;
    let Lf = params.Lf ?? 0;
    let Ct = 0;

    const policy = await (this.prisma as any).policy.findFirst({
      where: { userId: params.driverId, status: 'ACTIVE', endDate: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    });

    if (!policy) {
      throw new NotFoundException('Active policy not found for payout');
    }

    const resolved = ctForPlan(policy.planType ?? null);
    if (resolved == null) {
      throw new BadRequestException('Invalid plan tier for payout');
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
    const payout = dailyIncome * Ct * Lf;

    return {
      driverId: params.driverId,
      Ew,
      Lf,
      Ct,
      daily_income: Number(dailyIncome.toFixed(2)),
      payoutAmount: Number(payout.toFixed(2)),
    };
  }

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
      ? await (this.prisma as any).policy.findUnique({ where: { id: params.policyId } })
      : await (this.prisma as any).policy.findFirst({
          where: {
            userId: params.driverId,
            status: 'ACTIVE',
            endDate: { gt: now },
          },
          orderBy: { createdAt: 'desc' },
        });

    if (!policy) {
      throw new NotFoundException('Active policy not found');
    }

    if (policy.userId !== params.driverId) {
      throw new BadRequestException('Policy does not belong to driver');
    }

    if (policy.status !== 'ACTIVE' || policy.endDate <= now) {
      throw new BadRequestException('Policy is not active');
    }

    const h3Cell = params.h3Cell ?? (await this.redisState.getDriverState(params.driverId))?.last_location?.h3_cell;
    if (!h3Cell) {
      throw new NotFoundException('Missing H3 cell for payout');
    }

    const policyState = await this.redisState.getPolicyState(policy.id);
    const policyZone = policyState?.zone ?? null;
    if (!policyZone) {
      throw new BadRequestException('Policy zone not set');
    }

    if (policyZone !== h3Cell) {
      throw new BadRequestException('Policy zone mismatch');
    }

    const zoneState = await this.redisState.getZoneState(h3Cell);
    const zoneLabel = zoneState?.zone_state ?? zoneState?.state ?? 'UNKNOWN';
    if (zoneLabel !== 'HALTED') {
      throw new BadRequestException('Zone is not halted');
    }

    const disruption = await (this.prisma as any).disruptionEvent.create({
      data: {
        type: params.disruptionType ?? 'PARAMETRIC_TRIGGER',
        title: 'Parametric Trigger Event',
        expectedLoss: params.payoutAmount ?? 0,
        expectedPayout: params.payoutAmount ?? 0,
        occurredAt: now,
        verified: true,
      },
    });

    const amount = params.payoutAmount ?? 0;

    try {
      const payoutResult = await this.payments.processParametricPayout({
        userId: params.driverId,
        policyId: policy.id,
        disruptionEventId: disruption.id,
        eventTimestamp,
        h3Cell,
        approvedPayout: amount,
      });

      return {
        success: true,
        payoutId: payoutResult.payoutId,
        transactionId: payoutResult.transactionId ?? null,
        cached: payoutResult.cached ?? false,
      };
    } catch (err) {
      this.logger.error(`Payout processing failed for ${params.driverId}: ${err}`);
      await this.redisState.pushPayoutRetry({
        driverId: params.driverId,
        policyId: policy.id,
        disruptionEventId: disruption.id,
        h3Cell,
        approvedPayout: amount,
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
    const payouts = await (this.prisma as any).payout.findMany({
      where: { policy: { userId: driverId } },
      include: { disruptionEvent: true },
      orderBy: { createdAt: 'desc' },
    });

    return payouts.map((p: any) => ({
      payoutId: p.id,
      amount: p.approvedPayout ?? p.estimatedLoss ?? 0,
      status: p.status,
      transactionId: p.transactionId ?? null,
      createdAt: p.createdAt,
    }));
  }

  async listClaims(driverId: string) {
    const payouts = await (this.prisma as any).payout.findMany({
      where: { policy: { userId: driverId } },
      include: { disruptionEvent: true },
      orderBy: { createdAt: 'desc' },
    });

    return payouts.map((p: any) => ({
      claimId: p.id,
      status: p.status,
      amount: p.approvedPayout ?? p.estimatedLoss ?? 0,
      trigger: p.disruptionEvent?.type ?? 'UNKNOWN',
      createdAt: p.createdAt,
    }));
  }
}
