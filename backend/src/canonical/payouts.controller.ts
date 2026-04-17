import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentsService } from '../payments/payments.service';
import { PayoutService } from '../payout/payout.service';
import { RedisStateService } from '../state/redis-state.service';
import { PayoutInitiateDto } from './canonical.dto';

@Controller('payouts')
@UseGuards(JwtAuthGuard)
export class CanonicalPayoutsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly paymentsService: PaymentsService,
    private readonly payoutService: PayoutService,
    private readonly redisState: RedisStateService,
  ) {}

  private assertAccess(req: any, workerId: string) {
    if (req.user?.role === 'ADMIN') return;
    if (req.user?.id !== workerId) {
      throw new ForbiddenException('Cannot access another worker payouts');
    }
  }

  @Post('initiate')
  async initiate(@Request() req: any, @Body() dto: PayoutInitiateDto) {
    const claim = await this.prisma.payout.findUnique({
      where: { id: dto.claimId },
      include: {
        policy: true,
        disruptionEvent: true,
      },
    });

    if (!claim) {
      throw new ForbiddenException('Claim not found');
    }

    const workerId = dto.workerId ?? claim.policy.userId;
    this.assertAccess(req, workerId);

    const policyState = await this.redisState.getPolicyState(claim.policyId);
    const h3Cell = policyState?.zone ?? 'manual-claim';

    return this.paymentsService.processParametricPayout({
      userId: workerId,
      policyId: claim.policyId,
      disruptionEventId: claim.disruptionEventId,
      eventTimestamp: Math.floor((claim.disruptionEvent?.occurredAt ?? new Date()).getTime() / 1000),
      h3Cell,
      approvedPayout: Number(claim.approvedPayout ?? claim.estimatedLoss ?? 0),
    });
  }

  @Get(':claimId/status')
  async status(@Request() req: any, @Param('claimId') claimId: string) {
    const payout = await this.prisma.payout.findUnique({
      where: { id: claimId },
      include: { policy: true },
    });

    if (!payout) {
      throw new ForbiddenException('Payout not found');
    }

    this.assertAccess(req, payout.policy.userId);

    return {
      claimId,
      payoutId: payout.id,
      status: payout.status,
      transactionId: payout.transactionId,
      bankReference: payout.bankReference,
      transferredAt: payout.transferredAt,
      amount: payout.approvedPayout ?? payout.estimatedLoss ?? 0,
    };
  }

  @Get('history/:workerId')
  async history(@Request() req: any, @Param('workerId') workerId: string) {
    this.assertAccess(req, workerId);
    return this.payoutService.listPayouts(workerId);
  }
}
