import { Module } from '@nestjs/common';
import { TelemetryService } from './telemetry.service';
import { TelemetryController } from './telemetry.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { KafkaModule } from '../kafka/kafka.module';

@Module({
  imports: [PrismaModule, KafkaModule],
  controllers: [TelemetryController],
  providers: [TelemetryService],
  exports: [TelemetryService],
})
export class TelemetryModule {}
