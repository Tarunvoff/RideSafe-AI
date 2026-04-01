import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { PaymentsModule } from '../payments/payments.module';
import { StateModule } from '../state/state.module';
import { DynamicQCommerceModule } from '../dynamic-qcommerce/dynamic-qcommerce.module';
import { PayoutController } from './payout.controller';
import { PayoutService } from './payout.service';

@Module({
  imports: [PrismaModule, PaymentsModule, StateModule, DynamicQCommerceModule],
  controllers: [PayoutController],
  providers: [PayoutService],
  exports: [PayoutService],
})
export class PayoutModule {}
