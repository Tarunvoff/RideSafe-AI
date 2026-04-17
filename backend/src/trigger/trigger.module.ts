import { forwardRef, Module } from '@nestjs/common';
import { KafkaModule } from '../kafka/kafka.module';
import { StateModule } from '../state/state.module';
import { PrismaModule } from '../prisma/prisma.module';
import { TriggerController } from './trigger.controller';
import { TriggerService } from './trigger.service';

@Module({
  imports: [forwardRef(() => KafkaModule), StateModule, PrismaModule],
  controllers: [TriggerController],
  providers: [TriggerService],
  exports: [TriggerService],
})
export class TriggerModule {}
