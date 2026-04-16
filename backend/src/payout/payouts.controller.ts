import { Controller, ForbiddenException, Get, HttpCode, HttpStatus, Param, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PayoutService } from './payout.service';

@Controller('payouts')
@UseGuards(JwtAuthGuard)
export class PayoutsController {
  constructor(private readonly payoutService: PayoutService) {}

  private assertAuthorizedDriver(req: any, driverId: string) {
    if (req.user?.role === 'ADMIN') {
      return;
    }

    if (req.user?.id !== driverId) {
      throw new ForbiddenException('Cannot view another driver payouts');
    }
  }

  @Get(':driverId')
  @HttpCode(HttpStatus.OK)
  list(@Request() req: any, @Param('driverId') driverId: string) {
    this.assertAuthorizedDriver(req, driverId);
    return this.payoutService.listPayouts(driverId);
  }
}
