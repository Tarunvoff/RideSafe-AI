import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { PayoutIdempotencyService } from './payout-idempotency.service';

@Module({
  imports: [PrismaModule],
  controllers: [PaymentsController],
  providers: [PaymentsService, PayoutIdempotencyService],
  exports: [PayoutIdempotencyService],
})
export class PaymentsModule {}
