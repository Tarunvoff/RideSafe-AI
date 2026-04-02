import { forwardRef, Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { DynamicQCommerceModule } from '../dynamic-qcommerce/dynamic-qcommerce.module';
import { StateModule } from '../state/state.module';
import { FraudIntegrationModule } from '../fraud-integration/fraud-integration.module';
import { PayoutModule } from '../payout/payout.module';
import { InsuranceController } from './insurance.controller';
import { InsuranceService } from './insurance.service';
import { PolicyController } from './policy.controller';
import { ClaimsController } from './claims.controller';
import { ClaimOrchestratorService } from './claim-orchestrator.service';

@Module({
  imports: [
    PrismaModule,
    forwardRef(() => DynamicQCommerceModule),
    StateModule,
    FraudIntegrationModule,
    PayoutModule,
  ],
  controllers: [InsuranceController, PolicyController, ClaimsController],
  providers: [InsuranceService, ClaimOrchestratorService],
  exports: [ClaimOrchestratorService],
})
export class InsuranceModule {}
