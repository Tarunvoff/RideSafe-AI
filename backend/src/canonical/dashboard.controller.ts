import { Controller, ForbiddenException, Get, Param, Request, UseGuards } from '@nestjs/common';
import { AdminGuard, JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { AdminService } from '../admin/admin.service';

@Controller('dashboard')
@UseGuards(JwtAuthGuard)
export class CanonicalDashboardController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly adminService: AdminService,
  ) {}

  private assertAccess(req: any, workerId: string) {
    if (req.user?.role === 'ADMIN') return;
    if (req.user?.id !== workerId) {
      throw new ForbiddenException('Cannot access another worker dashboard');
    }
  }

  @Get('worker/:id')
  async worker(@Request() req: any, @Param('id') workerId: string) {
    this.assertAccess(req, workerId);

    const [activePolicy, latestClaim, latestPayout, fraud] = await Promise.all([
      this.prisma.policy.findFirst({
        where: { userId: workerId, status: 'ACTIVE', endDate: { gt: new Date() } },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.payout.findFirst({
        where: { policy: { userId: workerId } },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.payout.findFirst({
        where: { policy: { userId: workerId }, status: 'APPROVED' },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.fraudAnalysis.findUnique({ where: { userId: workerId } }),
    ]);

    return {
      workerId,
      activePolicy,
      latestClaim,
      latestPayout,
      fraudRisk: fraud?.riskScore ?? null,
    };
  }

  @Get('admin/overview')
  @UseGuards(AdminGuard)
  overview() {
    return this.adminService.getDashboardSummary();
  }

  @Get('admin/loss-ratio')
  @UseGuards(AdminGuard)
  async lossRatio() {
    const [premiumAgg, payoutAgg] = await Promise.all([
      this.prisma.policy.aggregate({ _sum: { premium: true } }),
      this.prisma.payout.aggregate({ _sum: { approvedPayout: true } }),
    ]);

    const totalPremium = Number(premiumAgg._sum.premium ?? 0);
    const totalPayout = Number(payoutAgg._sum.approvedPayout ?? 0);
    const ratio = totalPremium > 0 ? totalPayout / totalPremium : 0;

    return {
      totalPremium,
      totalPayout,
      lossRatio: Number(ratio.toFixed(4)),
    };
  }

  @Get('admin/predictions')
  @UseGuards(AdminGuard)
  async predictions() {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [recentDisruptions, recentClaims, recentPayouts] = await Promise.all([
      this.prisma.disruptionEvent.count({ where: { occurredAt: { gte: sevenDaysAgo } } }),
      this.prisma.payout.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
      this.prisma.payout.aggregate({
        _sum: { approvedPayout: true },
        where: { createdAt: { gte: sevenDaysAgo } },
      }),
    ]);

    return {
      horizonDays: 7,
      recentDisruptions,
      recentClaims,
      recentPayoutAmount: Number(recentPayouts._sum.approvedPayout ?? 0),
      nextWeekProjection: {
        expectedClaims: Math.round(recentClaims * 1.1),
        expectedDisruptions: Math.round(recentDisruptions * 1.05),
      },
    };
  }
}
