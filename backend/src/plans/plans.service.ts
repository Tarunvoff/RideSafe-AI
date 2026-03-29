import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as h3 from 'h3-js';

@Injectable()
export class PlansService {
  private readonly logger = new Logger(PlansService.name);
  constructor(private readonly prisma: PrismaService) {}

  async getWeeklyPlans(userId?: string) {
    const prisma = this.prisma as any;
    const plans = await prisma.weeklyPlan.findMany({
      orderBy: { price: 'asc' },
    });

    try {
      // 1. Identify User's Risk Baseline
      let driverRisk = 0.1; // Baseline Safe Form
      if (userId) {
        const analysis = await prisma.fraudAnalysis.findUnique({
          where: { userId },
          select: { riskScore: true }
        });
        if (analysis?.riskScore) driverRisk = analysis.riskScore / 100;
      }

      // 2. Fetch Live Dynamic Quotes from Python ML Engine
      for (const plan of plans) {
        const basePrice = plan.price;
        const payload = {
            Ew: 800.0,            // Demo Static Earnings
            Lf: driverRisk,       // Piped from their Fraud Analysis row
            Ct: plan.name.includes("Plus") ? 1.0 : 0.8, // Coverage Tier
            M: 0.10,              // 10% Insurance Margin
            platform: "uber",     
            demand_ratio: 1.2,    
            zone_volatility: 0.5  
        };

        const res = await fetch("http://localhost:8000/pricing", {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            signal: AbortSignal.timeout(3000)
        });

        if (res.ok) {
            const data = await res.json();
            plan.price = data.premium; // Automatically overwritten!
            (plan as any).multiplier = data.zone_multiplier;
        }
      }
    } catch(err) {
       this.logger.warn(`ML Pricing Service Unreachable. Using historical base prices.`);
    }

    return plans;
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
        // Hit the Parametric ML Fraud Engine
        let shouldBeApproved = false;
        try {
           const analysis = await prisma.fraudAnalysis.findUnique({
             where: { userId },
             select: { gpsLatitude: true, gpsLongitude: true, riskScore: true }
           });
           
           if (analysis && analysis.gpsLatitude && analysis.gpsLongitude) {
              const h3_cell = h3.latLngToCell(analysis.gpsLatitude, analysis.gpsLongitude, 8);
              const triggerRes = await fetch("http://localhost:8000/trigger", {
                 method: 'POST',
                 headers: { 'Content-Type': 'application/json' },
                 body: JSON.stringify({ 
                    h3_cell, 
                    fraud_score: (analysis.riskScore || 0) / 100 
                 }),
                 signal: AbortSignal.timeout(3000)
              });

              if (triggerRes.ok) {
                  const triggerData = await triggerRes.json();
                  shouldBeApproved = triggerData.decision === "APPROVED";
                  this.logger.log(`ML Trigger evaluated H3 Cell [${h3_cell}]: ${triggerData.decision}`);
              }
           }
        } catch (err) {
           this.logger.warn(`ML Trigger Service Unreachable: Evaluator locked.`);
        }

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

