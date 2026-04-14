import { Injectable, Logger } from '@nestjs/common';
import { DisruptionEvent, Policy, Payout, WeeklyPlan } from '@prisma/client';
import * as crypto from 'crypto';
import * as h3 from 'h3-js';
import { ctForPlan } from '../insurance/policy-tiers';
import { PrismaService } from '../prisma/prisma.service';

const ML_SERVICE_URL = process.env.ML_SERVICE_URL;
const H3_RESOLUTION = 8;

@Injectable()
export class PlansService {
  private readonly logger = new Logger(PlansService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Creates a realistic transfer reference for synthetic payout settlement mode.
   */
  private generateSyntheticPayoutReference(): string {
    const base62 = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
    const bytes = crypto.randomBytes(18);
    let result = '';
    for (const byte of bytes) {
      result += base62[byte % 62];
    }
    return `pout_${result}`;
  }

  /**
   * Returns active weekly plans with computed coverage factor Ct.
   */
  async getWeeklyPlans() {
    const plans = await this.prisma.weeklyPlan.findMany({
      orderBy: { price: 'asc' },
    });

    return plans.map((plan) => ({
      ...plan,
      Ct: ctForPlan(plan.key ?? null),
    }));
  }

  /**
   * Lists purchased active policies and resolves latest disruption claim status.
   */
  async getPurchasedPolicies(userId: string) {
    const now = new Date();

    const activePolicies = await this.prisma.policy.findMany({
      where: {
        userId,
        status: 'ACTIVE',
        endDate: { gt: now },
      },
      include: {
        weeklyPlan: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const latestDisruption = await this.prisma.disruptionEvent.findFirst({
      where: {
        verified: true,
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
      orderBy: { occurredAt: 'desc' },
    });

    const purchasedPolicies = [];

    for (const policy of activePolicies) {
      const weeklyPlan = policy.weeklyPlan;
      const eligibleTypes = weeklyPlan?.eligibleDisruptionTypes ?? [];
      const eligibleForLatest = !!latestDisruption && eligibleTypes.includes(latestDisruption.type);

      let payoutWithDisruption: (Payout & { disruptionEvent: DisruptionEvent | null }) | null = null;
      let claimStatus = 'NO_DISRUPTION_ELIGIBLE';

      if (latestDisruption && eligibleForLatest) {
        payoutWithDisruption = await this.resolvePayoutForPolicy(policy, latestDisruption, userId);
        claimStatus = this.claimStatusFromPayout(payoutWithDisruption.status);
      } else if (!latestDisruption) {
        claimStatus = 'NO_DISRUPTION';
      } else {
        claimStatus = 'INELIGIBLE_FOR_LATEST_DISRUPTION';
      }

      if (!payoutWithDisruption) {
        payoutWithDisruption = await this.prisma.payout.findFirst({
          where: { policyId: policy.id },
          include: { disruptionEvent: true },
          orderBy: { createdAt: 'desc' },
        });
        if (payoutWithDisruption) {
          claimStatus = this.claimStatusFromPayout(payoutWithDisruption.status);
        }
      }

      purchasedPolicies.push({
        policyId: policy.id,
        plan: {
          id: weeklyPlan?.id ?? null,
          key: weeklyPlan?.key ?? policy.planType,
          name: weeklyPlan?.name ?? policy.planType,
          price: policy.premium,
          maxPayout: weeklyPlan?.maxPayout ?? 0,
        },
        status: policy.status,
        startDate: policy.startDate,
        endDate: policy.endDate,
        eligibility: {
          eligibleForLatestDisruption: eligibleForLatest,
          claimStatus,
        },
        payout: payoutWithDisruption
          ? {
              payoutId: payoutWithDisruption.id,
              status: payoutWithDisruption.status,
              estimatedLoss: payoutWithDisruption.estimatedLoss,
              approvedPayout: payoutWithDisruption.approvedPayout,
              processingTime: payoutWithDisruption.processingTime,
              transactionId: payoutWithDisruption.transactionId,
              disruptionType: payoutWithDisruption.disruptionEvent?.type ?? null,
              bankReference: payoutWithDisruption.bankReference,
              transferredAt: payoutWithDisruption.transferredAt,
              createdAt: payoutWithDisruption.createdAt,
            }
          : null,
      });
    }

    return {
      latestDisruption: latestDisruption
        ? {
            id: latestDisruption.id,
            type: latestDisruption.type,
            title: latestDisruption.title,
            occurredAt: latestDisruption.occurredAt,
            expiresAt: latestDisruption.expiresAt,
            expectedLoss: latestDisruption.expectedLoss,
            expectedPayout: latestDisruption.expectedPayout,
            verified: latestDisruption.verified,
          }
        : null,
      purchasedPolicies,
    };
  }

  private claimStatusFromPayout(payoutStatus: string) {
    if (payoutStatus === 'APPROVED') return 'PAID_OUT';
    if (payoutStatus === 'PROCESSING') return 'PROCESSING';
    if (payoutStatus === 'REJECTED') return 'REJECTED';
    return 'UNKNOWN';
  }

  /**
   * Resolves or creates a payout record for one policy-disruption pair using ML trigger decision.
   */
  private async resolvePayoutForPolicy(
    policy: Policy & { weeklyPlan: WeeklyPlan | null },
    disruption: DisruptionEvent,
    userId: string,
  ): Promise<Payout & { disruptionEvent: DisruptionEvent | null }> {
    let shouldBeApproved = false;

    try {
      const analysis = await this.prisma.fraudAnalysis.findUnique({
        where: { userId },
        select: { gpsLatitude: true, gpsLongitude: true, riskScore: true },
      });

      if (analysis?.gpsLatitude && analysis?.gpsLongitude && ML_SERVICE_URL) {
        const h3Cell = h3.latLngToCell(analysis.gpsLatitude, analysis.gpsLongitude, H3_RESOLUTION);

        const triggerRes = await fetch(`${ML_SERVICE_URL}/trigger`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            h3_cell: h3Cell,
            fraud_score: (analysis.riskScore || 0) / 100,
          }),
          signal: AbortSignal.timeout(3000),
        });

        if (triggerRes.ok) {
          const triggerData = await triggerRes.json();
          shouldBeApproved = triggerData.decision === 'APPROVED';
          this.logger.log(`ML trigger evaluated H3 [${h3Cell}] => ${triggerData.decision}`);
        }
      }
    } catch (err) {
      this.logger.warn(`ML trigger evaluation unavailable for user=${userId}: ${String(err)}`);
    }

    const ct = ctForPlan(policy.weeklyPlan?.key ?? policy.planType ?? null) ?? 0.8;
    const tierWeight = Math.min(1, Math.max(0.1, ct / 0.8));
    const expectedLoss = Number(disruption.expectedLoss ?? 0);
    const expectedPayout = Number(disruption.expectedPayout ?? 0);
    const maxPayout = Number(policy.weeklyPlan?.maxPayout ?? 0);

    const estimatedLoss = Math.round(expectedLoss * tierWeight * 100) / 100;
    const approvedPayout =
      Math.round(Math.min(expectedPayout * tierWeight, maxPayout > 0 ? maxPayout : expectedPayout) * 100) / 100;

    let payout = await this.prisma.payout.findFirst({
      where: {
        policyId: policy.id,
        disruptionEventId: disruption.id,
      },
      include: { disruptionEvent: true },
    });

    if (!payout) {
      payout = await this.prisma.payout.create({
        data: {
          policyId: policy.id,
          disruptionEventId: disruption.id,
          status: shouldBeApproved ? 'APPROVED' : 'PROCESSING',
          estimatedLoss,
          approvedPayout,
          processingTime: shouldBeApproved ? 'Auto-credited' : 'Auto-processing',
          transactionId: shouldBeApproved ? this.generateSyntheticPayoutReference() : null,
          timeline: {
            steps: [
              { event: 'Disruption Detected', done: true },
              { event: 'Claim Auto-Triggered', done: true },
              { event: 'AI Verification', done: shouldBeApproved },
              { event: 'Payout Processed', done: shouldBeApproved },
            ],
          },
        },
        include: { disruptionEvent: true },
      });
      return payout;
    }

    if (shouldBeApproved && payout.status === 'PROCESSING') {
      payout = await this.prisma.payout.update({
        where: { id: payout.id },
        data: {
          status: 'APPROVED',
          approvedPayout,
          processingTime: 'Auto-credited',
          transactionId: payout.transactionId || this.generateSyntheticPayoutReference(),
        },
        include: { disruptionEvent: true },
      });
    }

    return payout;
  }
}
