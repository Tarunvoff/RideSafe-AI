import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { PremiumModule } from '../premium/premium.module';
import { PlansController } from './plans.controller';
import { PlansService } from './plans.service';
import { DisruptionBootstrapService } from './disruption-bootstrap.service';

@Module({
  imports: [PrismaModule, PremiumModule],
  controllers: [PlansController],
  providers: [PlansService, DisruptionBootstrapService],
  exports: [PlansService, PremiumModule],
})
export class PlansModule {}

