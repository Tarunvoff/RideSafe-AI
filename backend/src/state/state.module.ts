import { Module } from '@nestjs/common';
import { InternalStateController } from './internal-state.controller';
import { RedisStateService } from './redis-state.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [InternalStateController],
  providers: [RedisStateService],
  exports: [RedisStateService],
})
export class StateModule {}
