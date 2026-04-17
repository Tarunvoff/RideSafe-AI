import { Module, forwardRef } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { PremiumModule } from '../premium/premium.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ComplianceModule } from '../compliance/compliance.module';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { PayoutIdempotencyService } from './payout-idempotency.service';

@Module({
  imports: [PrismaModule, PremiumModule, NotificationsModule, ComplianceModule],
  controllers: [PaymentsController],
  providers: [PaymentsService, PayoutIdempotencyService],
  exports: [PaymentsService, PayoutIdempotencyService],
})
export class PaymentsModule {}
