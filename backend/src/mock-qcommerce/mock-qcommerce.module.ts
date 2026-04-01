import { Module } from '@nestjs/common';
import { MockQCommerceController } from './mock-qcommerce.controller';
import { MockQCommerceService } from './mock-qcommerce.service';

@Module({
  controllers: [MockQCommerceController],
  providers: [MockQCommerceService],
  exports: [MockQCommerceService],
})
export class MockQCommerceModule {}
