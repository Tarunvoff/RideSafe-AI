import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { DynamicQCommerceModule } from '../dynamic-qcommerce/dynamic-qcommerce.module';
import { StateModule } from '../state/state.module';
import { PremiumController } from './premium.controller';
import { PremiumService } from './premium.service';

@Module({
  imports: [PrismaModule, DynamicQCommerceModule, StateModule],
  controllers: [PremiumController],
  providers: [PremiumService],
  exports: [PremiumService],
})
export class PremiumModule {}
