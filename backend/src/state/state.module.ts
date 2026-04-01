import { Module } from '@nestjs/common';
import { RedisStateService } from './redis-state.service';

@Module({
  providers: [RedisStateService],
  exports: [RedisStateService],
})
export class StateModule {}
