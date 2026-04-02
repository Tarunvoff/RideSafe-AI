import { forwardRef, Module } from '@nestjs/common';
import { KafkaModule } from '../kafka/kafka.module';
import { DynamicQCommerceController } from './dynamic-qcommerce.controller';
import { PlatformActivityController } from './platform-activity.controller';
import { DynamicQCommerceService } from './dynamic-qcommerce.service';

@Module({
  imports: [forwardRef(() => KafkaModule)],
  controllers: [DynamicQCommerceController, PlatformActivityController],
  providers: [DynamicQCommerceService],
  exports: [DynamicQCommerceService],
})
export class DynamicQCommerceModule {}
