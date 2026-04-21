import { Module } from '@nestjs/common';
import { AssistantService } from './assistant.service';
import { UsersService } from '../users/users.service';
import { ClaimsService } from '../claims/claims.service';
import { WalletService } from '../wallet/wallet.service';
import { TrustScoreService } from '../trust-score/trust-score.service';
import { PlansModule } from '../plans/plans.module';

@Module({
  imports: [PlansModule],
  providers: [
    AssistantService,
    UsersService,
    ClaimsService,
    WalletService,
    TrustScoreService,
  ],
  exports: [AssistantService],
})
export class AssistantModule {}
