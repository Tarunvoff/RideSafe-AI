import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { InsuranceModule } from '../insurance/insurance.module';
import { PremiumModule } from '../premium/premium.module';
import { TriggerModule } from '../trigger/trigger.module';
import { PayoutModule } from '../payout/payout.module';
import { PaymentsModule } from '../payments/payments.module';
import { FraudModule } from '../fraud/fraud.module';
import { StateModule } from '../state/state.module';
import { AdminModule } from '../admin/admin.module';
import { CanonicalPoliciesController } from './policies.controller';
import { CanonicalPremiumsController } from './premiums.controller';
import { CanonicalTriggersController } from './triggers.controller';
import { CanonicalClaimsController } from './claims.controller';
import { CanonicalPayoutsController } from './payouts.controller';
import { CanonicalFraudController } from './fraud.controller';
import { CanonicalDashboardController } from './dashboard.controller';

@Module({
  imports: [
    PrismaModule,
    InsuranceModule,
    PremiumModule,
    TriggerModule,
    PayoutModule,
    PaymentsModule,
    FraudModule,
    StateModule,
    AdminModule,
  ],
  controllers: [
    CanonicalPoliciesController,
    CanonicalPremiumsController,
    CanonicalTriggersController,
    CanonicalClaimsController,
    CanonicalPayoutsController,
    CanonicalFraudController,
    CanonicalDashboardController,
  ],
})
export class CanonicalModule {}
