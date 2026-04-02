import { Module } from '@nestjs/common';
import { KafkaModule } from '../kafka/kafka.module';
import { StateModule } from '../state/state.module';
import { PrismaModule } from '../prisma/prisma.module';
import { FraudController } from './fraud.controller';
import { FraudService } from './fraud.service';

@Module({
  imports: [PrismaModule, KafkaModule, StateModule],
  controllers: [FraudController],
  providers: [FraudService],
  exports: [FraudService],
})
export class FraudModule {}
