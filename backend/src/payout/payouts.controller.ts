import { Controller, Get, HttpCode, HttpStatus, Param } from '@nestjs/common';
import { PayoutService } from './payout.service';

@Controller('payouts')
export class PayoutsController {
  constructor(private readonly payoutService: PayoutService) {}

  @Get(':driverId')
  @HttpCode(HttpStatus.OK)
  list(@Param('driverId') driverId: string) {
    return this.payoutService.listPayouts(driverId);
  }
}
