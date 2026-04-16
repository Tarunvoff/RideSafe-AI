import { Body, Controller, ForbiddenException, HttpCode, HttpStatus, Post, Request, UseGuards } from '@nestjs/common';
import { PayoutCalculateRequestDto, PayoutProcessRequestDto } from './dto/payout.dto';
import { PayoutService } from './payout.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('payout')
@UseGuards(JwtAuthGuard)
export class PayoutController {
  constructor(private readonly payoutService: PayoutService) {}

  private resolveAuthorizedDriverId(req: any, requestedDriverId?: string) {
    if (req.user?.role === 'ADMIN') {
      return requestedDriverId ?? req.user.id;
    }

    if (requestedDriverId && requestedDriverId !== req.user.id) {
      throw new ForbiddenException('Cannot process payout for another driver');
    }

    return req.user.id;
  }

  @Post('calculate')
  @HttpCode(HttpStatus.OK)
  calculate(@Request() req: any, @Body() dto: PayoutCalculateRequestDto) {
    const driverId = this.resolveAuthorizedDriverId(req, dto.driverId);
    return this.payoutService.calculatePayout({
      driverId,
      Ew: dto.Ew,
      Lf: dto.Lf,
      Ct: dto.Ct,
    });
  }

  @Post('process')
  @HttpCode(HttpStatus.OK)
  process(@Request() req: any, @Body() dto: PayoutProcessRequestDto) {
    const driverId = this.resolveAuthorizedDriverId(req, dto.driverId);
    return this.payoutService.processPayout({
      driverId,
      payoutAmount: dto.payoutAmount,
      h3Cell: dto.h3Cell,
      eventTimestamp: dto.eventTimestamp,
      policyId: dto.policyId,
      disruptionType: dto.disruptionType,
    });
  }
}
