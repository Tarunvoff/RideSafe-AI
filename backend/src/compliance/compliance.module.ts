import { Module } from '@nestjs/common';
import { ComplianceController } from './compliance.controller';
import { ReserveSustainabilityService } from './reserve-sustainability.service';
import { LiquidityPoolService } from './liquidity-pool.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ComplianceController],
  providers: [ReserveSustainabilityService, LiquidityPoolService],
  exports: [ReserveSustainabilityService, LiquidityPoolService],
})
export class ComplianceModule {}
