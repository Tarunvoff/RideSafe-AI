import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Post,
  Put,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AdminGuard, JwtAuthGuard } from '../auth/jwt-auth.guard';
import { InsuranceService } from '../insurance/insurance.service';
import { PrismaService } from '../prisma/prisma.service';
import { ManualClaimTriggerDto } from './canonical.dto';

@Controller('claims')
@UseGuards(JwtAuthGuard)
export class CanonicalClaimsController {
  constructor(
    private readonly insuranceService: InsuranceService,
    private readonly prisma: PrismaService,
  ) {}

  private assertAccess(req: any, workerId: string) {
    if (req.user?.role === 'ADMIN') return;
    if (req.user?.id !== workerId) {
      throw new ForbiddenException('Cannot access another worker claims');
    }
  }

  @Post('trigger')
  async trigger(@Request() req: any, @Body() dto: ManualClaimTriggerDto) {
    const workerId = dto.workerId ?? req.user.id;
    this.assertAccess(req, workerId);

    return this.insuranceService.processInsurance(workerId, {
      lat: dto.lat,
      lng: dto.lng,
      eventType: dto.eventType ?? 'MANUAL_CLAIM_TRIGGER',
      eventTimestamp: Math.floor(Date.now() / 1000),
    });
  }

  @Get(':id/status')
  async status(@Request() req: any, @Param('id') claimId: string) {
    const claim = await this.prisma.payout.findUnique({
      where: { id: claimId },
      include: { policy: true, disruptionEvent: true },
    });

    if (!claim) {
      throw new ForbiddenException('Claim not found');
    }
    this.assertAccess(req, claim.policy.userId);

    return {
      claimId: claim.id,
      status: claim.status,
      amount: claim.approvedPayout ?? claim.estimatedLoss ?? 0,
      policyId: claim.policyId,
      event: claim.disruptionEvent?.type ?? null,
      createdAt: claim.createdAt,
      transferredAt: claim.transferredAt,
    };
  }

  @Put(':id/approve')
  @UseGuards(AdminGuard)
  async approve(@Param('id') claimId: string) {
    const claim = await this.prisma.payout.findUnique({ where: { id: claimId } });
    if (!claim) {
      throw new ForbiddenException('Claim not found');
    }

    const updated = await this.prisma.payout.update({
      where: { id: claimId },
      data: {
        status: 'APPROVED',
        transferredAt: claim.transferredAt ?? new Date(),
      },
    });

    return {
      claimId: updated.id,
      status: updated.status,
    };
  }
}
