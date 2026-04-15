import { Module } from '@nestjs/common';
import { InternalStateController } from './internal-state.controller';
import { RedisStateService } from './redis-state.service';

@Module({
  controllers: [InternalStateController],
  providers: [RedisStateService],
  exports: [RedisStateService],
})
export class StateModule {}
