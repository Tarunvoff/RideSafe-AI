import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { PayoutCalculateRequestDto, PayoutProcessRequestDto } from './dto/payout.dto';
import { PayoutService } from './payout.service';

@Controller('payout')
export class PayoutController {
  constructor(private readonly payoutService: PayoutService) {}

  @Post('calculate')
  @HttpCode(HttpStatus.OK)
  calculate(@Body() dto: PayoutCalculateRequestDto) {
    return this.payoutService.calculatePayout({
      driverId: dto.driverId,
      Ew: dto.Ew,
      Lf: dto.Lf,
      Ct: dto.Ct,
    });
  }

  @Post('process')
  @HttpCode(HttpStatus.OK)
  process(@Body() dto: PayoutProcessRequestDto) {
    return this.payoutService.processPayout({
      driverId: dto.driverId,
      payoutAmount: dto.payoutAmount,
      h3Cell: dto.h3Cell,
      eventTimestamp: dto.eventTimestamp,
      policyId: dto.policyId,
      disruptionType: dto.disruptionType,
    });
  }
}
