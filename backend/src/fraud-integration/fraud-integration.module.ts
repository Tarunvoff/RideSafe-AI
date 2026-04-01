import { Module } from '@nestjs/common';
import { FraudModule } from '../fraud/fraud.module';
import { StateModule } from '../state/state.module';
import { FraudIntegrationService } from './fraud-integration.service';

@Module({
  imports: [FraudModule, StateModule],
  providers: [FraudIntegrationService],
  exports: [FraudIntegrationService],
})
export class FraudIntegrationModule {}
