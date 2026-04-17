import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PremiumService } from '../premium/premium.service';
import { PaymentsService } from '../payments/payments.service';
import { PrismaService } from '../prisma/prisma.service';
import { PremiumCalculateDto } from './canonical.dto';

@Controller('premiums')
@UseGuards(JwtAuthGuard)
export class CanonicalPremiumsController {
  constructor(
    private readonly premiumService: PremiumService,
    private readonly paymentsService: PaymentsService,
    private readonly prisma: PrismaService,
  ) {}

  private assertAccess(req: any, workerId: string) {
    if (req.user?.role === 'ADMIN') return;
    if (req.user?.id !== workerId) {
      throw new ForbiddenException('Cannot access another worker premium records');
    }
  }

  @Get('calculate')
  calculate(@Request() req: any, @Query() query: PremiumCalculateDto) {
    const workerId = query.workerId ?? req.user.id;
    this.assertAccess(req, workerId);
    return this.premiumService.calculateWeeklyPremium(workerId, query.planId);
  }

  @Post('deduct')
  async deduct(
    @Request() req: any,
    @Body() body: { workerId?: string; weeklyPlanId: string },
  ) {
    const workerId = body.workerId ?? req.user.id;
    this.assertAccess(req, workerId);
    const order = await this.paymentsService.createOrder(workerId, body.weeklyPlanId);
    return {
      message: 'Premium deduction order initialized',
      workerId,
      order,
    };
  }

  @Get('history/:workerId')
  async history(@Request() req: any, @Param('workerId') workerId: string) {
    this.assertAccess(req, workerId);
    const orders = await this.prisma.razorpayOrder.findMany({
      where: { userId: workerId },
      include: { weeklyPlan: true },
      orderBy: { createdAt: 'desc' },
    });

    return {
      workerId,
      payments: orders.map((o) => ({
        id: o.id,
        orderId: o.razorpayOrderId,
        status: o.status,
        amount: Number((o.amount ?? 0) / 100),
        currency: o.currency,
        plan: o.weeklyPlan?.key ?? null,
        createdAt: o.createdAt,
      })),
    };
  }
}
