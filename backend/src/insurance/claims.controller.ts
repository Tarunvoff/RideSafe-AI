import { Controller, Get, HttpCode, HttpStatus, Param } from '@nestjs/common';
import { PayoutService } from '../payout/payout.service';

@Controller('claims')
export class ClaimsController {
  constructor(private readonly payoutService: PayoutService) {}

  @Get(':driverId')
  @HttpCode(HttpStatus.OK)
  list(@Param('driverId') driverId: string) {
    return this.payoutService.listClaims(driverId);
  }
}
