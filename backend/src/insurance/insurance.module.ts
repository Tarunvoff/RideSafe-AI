import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { DynamicQCommerceModule } from '../dynamic-qcommerce/dynamic-qcommerce.module';
import { StateModule } from '../state/state.module';
import { FraudIntegrationModule } from '../fraud-integration/fraud-integration.module';
import { PayoutModule } from '../payout/payout.module';
import { InsuranceController } from './insurance.controller';
import { InsuranceService } from './insurance.service';
import { PolicyController } from './policy.controller';

@Module({
  imports: [
    PrismaModule,
    DynamicQCommerceModule,
    StateModule,
    FraudIntegrationModule,
    PayoutModule,
  ],
  controllers: [InsuranceController, PolicyController],
  providers: [InsuranceService],
})
export class InsuranceModule {}
