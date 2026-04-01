import { Module } from '@nestjs/common';
import { KafkaModule } from '../kafka/kafka.module';
import { StateModule } from '../state/state.module';
import { TriggerController } from './trigger.controller';
import { TriggerService } from './trigger.service';

@Module({
  imports: [KafkaModule, StateModule],
  controllers: [TriggerController],
  providers: [TriggerService],
  exports: [TriggerService],
})
export class TriggerModule {}
