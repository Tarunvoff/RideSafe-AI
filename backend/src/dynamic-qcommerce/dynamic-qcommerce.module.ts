import { forwardRef, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { KafkaModule } from '../kafka/kafka.module';
import { DynamicQCommerceController } from './dynamic-qcommerce.controller';
import { PlatformActivityController } from './platform-activity.controller';
import { DynamicQCommerceService } from './dynamic-qcommerce.service';

@Module({
  imports: [
    forwardRef(() => KafkaModule),
    JwtModule.register({
      secret: process.env.MOCK_OAUTH_JWT_SECRET ?? process.env.JWT_SECRET,
      signOptions: { expiresIn: process.env.MOCK_OAUTH_ACCESS_TOKEN_TTL ?? '10m' },
    }),
  ],
  controllers: [DynamicQCommerceController, PlatformActivityController],
  providers: [DynamicQCommerceService],
  exports: [DynamicQCommerceService],
})
export class DynamicQCommerceModule {}
