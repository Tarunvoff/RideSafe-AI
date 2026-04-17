import { forwardRef, Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { KafkaModule } from '../kafka/kafka.module';
import { StateModule } from '../state/state.module';
import { PrismaModule } from '../prisma/prisma.module';
import { FraudController } from './fraud.controller';
import { FraudService } from './fraud.service';
import { FraudQueueProcessor } from './fraud-queue.processor';

import { NotificationModule } from '../notifications/notification.module';

@Module({
  imports: [
    PrismaModule,
    forwardRef(() => KafkaModule),
    StateModule,
    NotificationModule,
    BullModule.registerQueue({
      name: 'fraud-review',
    }),
  ],
  controllers: [FraudController],
  providers: [FraudService, FraudQueueProcessor],
  exports: [FraudService],
})
export class FraudModule {}
