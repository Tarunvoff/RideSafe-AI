import { Module } from '@nestjs/common';
import { KafkaModule } from '../kafka/kafka.module';
import { KafkaProducerService } from '../kafka/kafka.producer.service';
import { PrismaModule } from '../prisma/prisma.module';
import { FraudController } from './fraud.controller';
import { FraudService } from './fraud.service';

@Module({
  imports: [PrismaModule, KafkaModule],
  controllers: [FraudController],
  providers: [FraudService, KafkaProducerService],
})
export class FraudModule {}
