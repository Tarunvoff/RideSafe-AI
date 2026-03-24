import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PlansService {
  constructor(private readonly prisma: PrismaService) {}

  async getWeeklyPlans() {
    const prisma = this.prisma as any;
    return prisma.weeklyPlan.findMany({
      orderBy: { price: 'asc' },
    });
  }

  async getPurchasedPolicies(userId: string) {
    const prisma = this.prisma as any;
    const now = new Date();

    const activePolicies = await prisma.policy.findMany({
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

    const latestDisruption = await prisma.disruptionEvent.findFirst({
      where: {
        verified: true,
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
      orderBy: { occurredAt: 'desc' },
    });

    // Used for UI mapping. Keep these labels stable for the frontend.
    const claimStatusFromPayout = (payoutStatus: string) => {
      if (payoutStatus === 'APPROVED') return 'PAID_OUT';
      if (payoutStatus === 'PROCESSING') return 'PROCESSING';
      if (payoutStatus === 'REJECTED') return 'REJECTED';
      return 'UNKNOWN';
    };

    const purchasedPolicies = [];

    for (const policy of activePolicies) {
      const weeklyPlan = policy.weeklyPlan;
      const eligibleTypes = weeklyPlan?.eligibleDisruptionTypes ?? [];
      const eligibleForLatest =
        !!latestDisruption && eligibleTypes.includes(latestDisruption.type);

      let payout: any = null;
      let claimStatus = 'NO_DISRUPTION_ELIGIBLE';

      if (latestDisruption && eligibleForLatest) {
        // Simple rule to make the UI feel "real":
        // if the disruption happened recently -> PROCESSING, else -> APPROVED.
        const minutesSinceEvent = (now.getTime() - latestDisruption.occurredAt.getTime()) / 60000;
        const shouldBeApproved = minutesSinceEvent >= 3;

        let existingPayout = await prisma.payout.findFirst({
          where: {
            policyId: policy.id,
            disruptionEventId: latestDisruption.id,
          },
        });

        if (!existingPayout) {
          existingPayout = await prisma.payout.create({
            data: {
              policyId: policy.id,
              disruptionEventId: latestDisruption.id,
              status: shouldBeApproved ? 'APPROVED' : 'PROCESSING',
              estimatedLoss: latestDisruption.expectedLoss ?? 0,
              approvedPayout: latestDisruption.expectedPayout ?? 0,
              processingTime: shouldBeApproved ? 'Auto-credited' : 'Auto-processing',
              timeline: {
                steps: [
                  { event: 'Disruption Detected', done: true },
                  { event: 'Claim Auto-Triggered', done: true },
                  { event: 'AI Verification', done: shouldBeApproved },
                  { event: 'Payout Processed', done: shouldBeApproved },
                ],
              },
            },
          });
        } else if (shouldBeApproved && existingPayout.status === 'PROCESSING') {
          existingPayout = await prisma.payout.update({
            where: { id: existingPayout.id },
            data: {
              status: 'APPROVED',
              approvedPayout: latestDisruption.expectedPayout ?? existingPayout.approvedPayout ?? 0,
              processingTime: 'Auto-credited',
            },
          });
        }

        payout = existingPayout;
        claimStatus = claimStatusFromPayout(existingPayout.status);
      } else if (!latestDisruption) {
        claimStatus = 'NO_DISRUPTION';
      } else {
        claimStatus = 'INELIGIBLE_FOR_LATEST_DISRUPTION';
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
        payout: payout
          ? {
              payoutId: payout.id,
              status: payout.status,
              estimatedLoss: payout.estimatedLoss,
              approvedPayout: payout.approvedPayout,
              processingTime: payout.processingTime,
              transactionId: payout.transactionId,
              createdAt: payout.createdAt,
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
}

