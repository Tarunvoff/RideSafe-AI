import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  private defaultSettings() {
    return {
      alertThresholds: {
        fraudBlockThreshold: Number(process.env.FRAUD_BLOCK_THRESHOLD ?? 0.7),
        highRiskScore: 70,
      },
      riskConfig: {
        deviceSwitchFrequency: 3,
        gpsSpeedMax: 150,
        h3ZoneConsistencyMin: 0.3,
        claimsLast30dMax: 10,
      },
      planConfig: {
        autoRenewDefault: true,
        gracePeriodDays: 2,
      },
      verificationSettings: {
        kycReviewSlaHours: 48,
        allowManualOverride: true,
      },
      notifications: {
        adminEmailAlerts: true,
        webhookUrl: null,
      },
    };
  }

  async getSettings() {
    const prisma = this.prisma;
    const existing = await prisma.adminSettings.findFirst();
    if (existing) return existing;

    const defaults = this.defaultSettings();
    return prisma.adminSettings.create({ data: defaults });
  }

  async updateSettings(section: string, payload: Record<string, any>) {
    const allowed = [
      'alertThresholds',
      'riskConfig',
      'planConfig',
      'verificationSettings',
      'notifications',
    ];
    if (!allowed.includes(section)) {
      throw new BadRequestException('Invalid settings section');
    }

    const prisma = this.prisma;
    const existing = await prisma.adminSettings.findFirst();
    if (!existing) {
      const defaults = this.defaultSettings();
      return prisma.adminSettings.create({
        data: {
          ...defaults,
          [section]: payload,
        },
      });
    }

    return prisma.adminSettings.update({
      where: { id: existing.id },
      data: { [section]: payload },
    });
  }

  async getAdminProfile(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Admin not found');
    return {
      id: user.id,
      email: user.email,
      phone: user.phone ?? null,
      displayName: user.driverName ?? null,
    };
  }

  async updateAdminProfile(userId: string, dto: { displayName?: string; phone?: string }) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Admin not found');

    const data: any = {};
    if (dto.displayName !== undefined) data.driverName = dto.displayName;
    if (dto.phone !== undefined) data.phone = dto.phone;

    const updated = await this.prisma.user.update({ where: { id: userId }, data });
    return {
      id: updated.id,
      email: updated.email,
      phone: updated.phone ?? null,
      displayName: updated.driverName ?? null,
    };
  }

  async getDashboardSummary() {
    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);

    const prisma = this.prisma;

    const [
      totalWorkers,
      activePlans,
      activeAlerts,
      claimsToday,
      highRiskWorkers,
      payoutAgg,
      overallPayoutAgg,
      premiumAgg,
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
      prisma.payout.aggregate({
        _sum: { approvedPayout: true },
      }),
      prisma.policy.aggregate({
        _sum: { premium: true },
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

    let riskTrend: any[] = [];
    let payoutTrend: any[] = [];
    let workersByCity: any[] = [];
    let platformSplit: any[] = [];
    let claimsByType: any[] = [];
    let alertsByType: any[] = [];
    let fraudStatusSplit: any[] = [];
    try {
      riskTrend = await prisma.$queryRaw`
        SELECT DATE_TRUNC('day', "createdAt") as day, AVG("riskScore") as avg_risk, COUNT(*)::int as total
        FROM fraud_analysis
        WHERE "createdAt" > NOW() - INTERVAL '14 days'
        GROUP BY 1
        ORDER BY 1
      `;
    } catch (err: any) {
      riskTrend = [];
    }

    try {
      payoutTrend = await prisma.$queryRaw`
        SELECT DATE_TRUNC('day', "createdAt") as day, SUM("approvedPayout") as total_payout
        FROM payouts
        WHERE "createdAt" > NOW() - INTERVAL '14 days'
        GROUP BY 1
        ORDER BY 1
      `;
    } catch (err: any) {
      payoutTrend = [];
    }

    try {
      workersByCity = await prisma.$queryRaw`
        SELECT pd.city as label, COUNT(*)::int as value
        FROM kyc_personal_details pd
        JOIN users u ON u.id = pd."userId"
        WHERE u.role = 'DRIVER'
        GROUP BY pd.city
        ORDER BY value DESC
        LIMIT 8
      `;
    } catch (err: any) {
      workersByCity = [];
    }

    try {
      platformSplit = await prisma.$queryRaw`
        SELECT COALESCE(NULLIF(TRIM(u.platform), ''), 'Unknown') as label, COUNT(*)::int as value
        FROM users u
        WHERE u.role = 'DRIVER'
        GROUP BY 1
        ORDER BY value DESC
      `;
    } catch (err: any) {
      platformSplit = [];
    }

    try {
      claimsByType = await prisma.$queryRaw`
        SELECT de.type as label, COUNT(*)::int as value
        FROM payouts p
        JOIN disruption_events de ON de.id = p."disruptionEventId"
        WHERE p."createdAt" > NOW() - INTERVAL '30 days'
        GROUP BY de.type
        ORDER BY value DESC
      `;
    } catch (err: any) {
      claimsByType = [];
    }

    try {
      alertsByType = await prisma.$queryRaw`
        SELECT de.type as label, COUNT(*)::int as value
        FROM disruption_events de
        WHERE de.verified = true
          AND de."occurredAt" > NOW() - INTERVAL '30 days'
        GROUP BY de.type
        ORDER BY value DESC
      `;
    } catch (err: any) {
      alertsByType = [];
    }

    try {
      fraudStatusSplit = await prisma.$queryRaw`
        SELECT COALESCE(NULLIF(TRIM(f.status), ''), 'UNKNOWN') as label, COUNT(*)::int as value
        FROM fraud_analysis f
        GROUP BY 1
        ORDER BY value DESC
      `;
    } catch (err: any) {
      fraudStatusSplit = [];
    }

    const projectedPayout = payoutAgg?._sum?.approvedPayout ?? 0;
    const totalApprovedPayout = overallPayoutAgg?._sum?.approvedPayout ?? 0;
    const totalPremiumCollected = premiumAgg?._sum?.premium ?? 0;
    
    // P-012: Loss Ratio metric (Payouts / Premiums)
    const lossRatio = totalPremiumCollected > 0 ? totalApprovedPayout / totalPremiumCollected : 0;
    const lossRatioPercent = Math.round(lossRatio * 10000) / 100;
    
    // P-012: Benefit-Cost Ratio metric (Premiums / Payouts? Standard is BCR = Benefit / Cost. For platform, BCR = Payouts / Premiums = Loss Ratio, but from rider's view it's the same. We'll send it down explicitly)
    const benefitCostRatio = totalPremiumCollected > 0 ? totalApprovedPayout / totalPremiumCollected : 0;

    return {
      totalWorkers,
      activePlans,
      activeAlerts,
      claimsToday,
      highRiskWorkers,
      projectedPayout,
      simulatedPayout: projectedPayout,
      totalApprovedPayout,
      totalPremiumCollected,
      lossRatio,
      lossRatioPercent,
      benefitCostRatio,
      recentAlerts: (recentAlerts ?? []).map((alert: any) => ({
        id: alert.id,
        type: alert.type,
        title: alert.title,
        occurredAt: alert.occurredAt,
        expectedPayout: alert.expectedPayout ?? null,
      })),
      recentClaims,
      riskTrend,
      payoutTrend,
      workersByCity,
      platformSplit,
      claimsByType,
      alertsByType,
      fraudStatusSplit,
    };
  }

  async getAlerts(filters?: { take?: number; skip?: number }) {
    const prisma = this.prisma;
    const [total, alerts] = await Promise.all([
      prisma.disruptionEvent.count(),
      prisma.disruptionEvent.findMany({
        orderBy: { occurredAt: 'desc' },
        take: filters?.take ?? 20,
        skip: filters?.skip ?? 0,
      }),
    ]);

    return {
      total,
      alerts: (alerts ?? []).map((alert: any) => ({
        id: alert.id,
        type: alert.type,
        title: alert.title,
        occurredAt: alert.occurredAt,
        expiresAt: alert.expiresAt ?? null,
        expectedLoss: alert.expectedLoss ?? null,
        expectedPayout: alert.expectedPayout ?? null,
        verified: alert.verified ?? false,
      })),
    };
  }

  async getWorkers(filters?: {
    search?: string;
    status?: string;
    risk?: string;
    city?: string;
    platform?: string;
    take?: number;
    skip?: number;
  }) {
    const prisma = this.prisma;
    const search = filters?.search?.trim();
    const status = filters?.status?.trim();
    const risk = filters?.risk?.trim();
    const city = filters?.city?.trim();
    const platform = filters?.platform?.trim();

    const where: any = { role: 'DRIVER' };

    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (status) {
      where.kycProfile = { status };
    }

    if (risk === 'high') {
      where.fraudAnalysis = { riskScore: { gte: 70 } };
    }

    if (city) {
      where.kycPersonalDetails = { city: { equals: city, mode: 'insensitive' } };
    }

    if (platform) {
      where.platform = { equals: platform, mode: 'insensitive' };
    }

    const users = await prisma.user.findMany({
      where,
      include: { kycProfile: true, kycPersonalDetails: true },
      orderBy: { createdAt: 'desc' },
      take: filters?.take ?? 200,
      skip: filters?.skip ?? 0,
    });

    return (users ?? []).map((user: any) => ({
      profileId: user.kycProfile?.id ?? user.id,
      userId: user.id,
      email: user.email,
      phone: user.phone ?? null,
      status: user.kycProfile?.status ?? 'NOT_STARTED',
      submittedAt: user.kycProfile?.submittedAt ?? user.createdAt,
      userCreatedAt: user.createdAt,
      city: user.kycPersonalDetails?.city ?? null,
      platform: user.platform ?? null,
    }));
  }

  async getClaims(filters?: {
    search?: string;
    status?: string;
    type?: string;
    take?: number;
    skip?: number;
  }) {
    const prisma = this.prisma;
    const search = filters?.search?.trim();
    const status = filters?.status?.trim();
    const type = filters?.type?.trim();

    const where: any = {};
    if (status) where.status = status;
    if (type) where.disruptionEvent = { type };
    if (search) {
      where.policy = {
        user: { email: { contains: search, mode: 'insensitive' } },
      };
    }

    const [total, pendingReview, payoutAgg, claims] = await Promise.all([
      prisma.payout.count({ where }),
      prisma.payout.count({ where: { ...where, status: 'PROCESSING' } }),
      prisma.payout.aggregate({ _sum: { approvedPayout: true }, where }),
      prisma.payout.findMany({
        where,
        include: {
          policy: { include: { user: true } },
          disruptionEvent: true,
        },
        orderBy: { createdAt: 'desc' },
        take: filters?.take ?? 100,
        skip: filters?.skip ?? 0,
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

  async getFraudQueue(params: { page?: number; limit?: number }) {
    const page = Math.max(1, Number(params.page ?? 1));
    const limit = Math.max(1, Math.min(100, Number(params.limit ?? 20)));
    const skip = (page - 1) * limit;

    const [total, rows] = await Promise.all([
      this.prisma.fraudAnalysis.count({ where: { status: 'INCONCLUSIVE' } }),
      this.prisma.fraudAnalysis.findMany({
        where: { status: 'INCONCLUSIVE' },
        include: {
          user: {
            select: { id: true, email: true, phone: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip,
      }),
    ]);

    return {
      page,
      limit,
      total,
      items: rows.map((row) => {
        const details = row.analysisDetails ? JSON.parse(row.analysisDetails) : {};
        return {
          analysisId: row.id,
          userId: row.userId,
          userEmail: row.user?.email ?? null,
          userPhone: row.user?.phone ?? null,
          riskScore: row.riskScore,
          top_signals: details.top_signals ?? [],
          fraud_reason: details.fraud_reason ?? null,
          created_at: row.createdAt,
        };
      }),
    };
  }

  async decideFraudCase(
    analysisId: string,
    body: { decision: 'APPROVE' | 'REJECT'; note: string },
  ) {
    const analysis = await this.prisma.fraudAnalysis.findUnique({ where: { id: analysisId } });
    if (!analysis) {
      throw new NotFoundException('Fraud analysis not found');
    }

    const nextStatus = body.decision === 'APPROVE' ? 'APPROVED' : 'REJECTED';
    const updated = await this.prisma.fraudAnalysis.update({
      where: { id: analysisId },
      data: {
        status: nextStatus,
        reviewNote: body.note,
        reviewedAt: new Date(),
      },
    });

    return {
      analysisId: updated.id,
      userId: updated.userId,
      status: updated.status,
      reviewNote: updated.reviewNote,
      reviewedAt: updated.reviewedAt,
      audit: {
        decision: body.decision,
        note: body.note,
        created_at: new Date().toISOString(),
      },
    };
  }

  async getPendingDisruptions() {
    const rows = await this.prisma.disruptionEvent.findMany({
      where: { verified: false },
      orderBy: { occurredAt: 'desc' },
      take: 100,
    });
    return rows.map((row) => ({
      id: row.id,
      type: row.type,
      title: row.title,
      affectedZones: [],
      expectedLoss: row.expectedLoss,
      expectedPayout: row.expectedPayout,
      occurredAt: row.occurredAt,
      verified: row.verified,
    }));
  }

  async verifyDisruption(id: string, body: { verified: boolean; adjustedLoss?: number }) {
    const existing = await this.prisma.disruptionEvent.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Disruption event not found');
    }

    const expectedLoss = body.adjustedLoss != null ? body.adjustedLoss : existing.expectedLoss;
    const updated = await this.prisma.disruptionEvent.update({
      where: { id },
      data: {
        verified: body.verified,
        expectedLoss,
      },
    });

    return {
      id: updated.id,
      verified: updated.verified,
      expectedLoss: updated.expectedLoss,
      expectedPayout: updated.expectedPayout,
      occurredAt: updated.occurredAt,
    };
  }
}
