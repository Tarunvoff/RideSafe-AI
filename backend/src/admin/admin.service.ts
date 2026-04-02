import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboardSummary() {
    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);

    const prisma = this.prisma as any;

    const [
      totalWorkers,
      activePlans,
      activeAlerts,
      claimsToday,
      highRiskWorkers,
      payoutAgg,
      recentAlerts,
      recentClaimsRaw,
    ] = await Promise.all([
      prisma.user.count({ where: { role: 'DRIVER' } }),
      prisma.policy.count({ where: { status: 'ACTIVE', endDate: { gt: now } } }),
      prisma.disruptionEvent.count({
        where: {
          verified: true,
          OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        },
      }),
      prisma.payout.count({ where: { createdAt: { gte: startOfDay } } }),
      prisma.fraudAnalysis.count({ where: { riskScore: { gte: 70 } } }),
      prisma.payout.aggregate({
        _sum: { approvedPayout: true },
        where: { createdAt: { gte: startOfDay } },
      }),
      prisma.disruptionEvent.findMany({
        orderBy: { occurredAt: 'desc' },
        take: 3,
      }),
      prisma.payout.findMany({
        include: {
          policy: { include: { user: true } },
          disruptionEvent: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
    ]);

    const recentClaims = (recentClaimsRaw ?? []).map((p: any) => ({
      payoutId: p.id,
      status: p.status,
      estimatedLoss: p.estimatedLoss ?? null,
      approvedPayout: p.approvedPayout ?? null,
      createdAt: p.createdAt,
      policyId: p.policyId,
      userEmail: p.policy?.user?.email ?? null,
      disruption: {
        type: p.disruptionEvent?.type ?? null,
        title: p.disruptionEvent?.title ?? null,
      },
    }));

    return {
      totalWorkers,
      activePlans,
      activeAlerts,
      claimsToday,
      highRiskWorkers,
      simulatedPayout: payoutAgg?._sum?.approvedPayout ?? 0,
      recentAlerts: (recentAlerts ?? []).map((alert: any) => ({
        id: alert.id,
        type: alert.type,
        title: alert.title,
        occurredAt: alert.occurredAt,
        expectedPayout: alert.expectedPayout ?? null,
      })),
      recentClaims,
    };
  }

  async getWorkers() {
    const prisma = this.prisma as any;
    const users = await prisma.user.findMany({
      where: { role: 'DRIVER' },
      include: { kycProfile: true },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    return (users ?? []).map((user: any) => ({
      profileId: user.kycProfile?.id ?? user.id,
      userId: user.id,
      email: user.email,
      phone: user.phone ?? null,
      status: user.kycProfile?.status ?? 'NOT_STARTED',
      submittedAt: user.kycProfile?.submittedAt ?? user.createdAt,
      userCreatedAt: user.createdAt,
    }));
  }

  async getClaims() {
    const prisma = this.prisma as any;

    const [total, pendingReview, payoutAgg, claims] = await Promise.all([
      prisma.payout.count(),
      prisma.payout.count({ where: { status: 'PROCESSING' } }),
      prisma.payout.aggregate({ _sum: { approvedPayout: true } }),
      prisma.payout.findMany({
        include: {
          policy: { include: { user: true } },
          disruptionEvent: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
    ]);

    return {
      total,
      pendingReview,
      totalPayout: payoutAgg?._sum?.approvedPayout ?? 0,
      claims: (claims ?? []).map((p: any) => ({
        payoutId: p.id,
        status: p.status,
        estimatedLoss: p.estimatedLoss ?? null,
        approvedPayout: p.approvedPayout ?? null,
        createdAt: p.createdAt,
        policyId: p.policyId,
        userEmail: p.policy?.user?.email ?? null,
        disruption: {
          type: p.disruptionEvent?.type ?? null,
          title: p.disruptionEvent?.title ?? null,
        },
      })),
    };
  }
}
