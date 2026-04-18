import { Module } from '@nestjs/common';
import { PostPayoutAuditService } from './post-payout-audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { RedisStateService } from '../state/redis-state.service';

@Module({
  providers: [PostPayoutAuditService, PrismaService, RedisStateService],
  exports: [PostPayoutAuditService],
})
export class RiskMonitorModule {}
