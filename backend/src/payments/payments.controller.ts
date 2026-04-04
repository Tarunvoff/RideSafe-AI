import { Body, Controller, HttpCode, HttpStatus, Request, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PaymentsService } from './payments.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { VerifyPaymentDto } from './dto/verify-payment.dto';
import { ParametricPayoutDto } from './dto/parametric-payout.dto';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('create-order')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  createOrder(@Request() req: any, @Body() dto: CreateOrderDto) {
    return this.paymentsService.createOrder(req.user.id, dto.weeklyPlanId);
  }

  @Post('verify')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  verify(@Request() req: any, @Body() dto: VerifyPaymentDto) {
    return this.paymentsService.verifyPayment(req.user.id, dto);
  }

  @Post('parametric-payout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  parametricPayout(@Request() req: any, @Body() dto: ParametricPayoutDto) {
    return this.paymentsService.processParametricPayout({
      userId: req.user.id,
      policyId: dto.policyId,
      disruptionEventId: dto.disruptionEventId,
      eventTimestamp: dto.eventTimestamp,
      h3Cell: dto.h3Cell,
      approvedPayout: dto.approvedPayout,
    });
  }
}

