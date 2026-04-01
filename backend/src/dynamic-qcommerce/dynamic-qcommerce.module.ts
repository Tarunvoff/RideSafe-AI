import { Module } from '@nestjs/common';
import { DynamicQCommerceController } from './dynamic-qcommerce.controller';
import { DynamicQCommerceService } from './dynamic-qcommerce.service';

@Module({
  controllers: [DynamicQCommerceController],
  providers: [DynamicQCommerceService],
  exports: [DynamicQCommerceService],
})
export class DynamicQCommerceModule {}
