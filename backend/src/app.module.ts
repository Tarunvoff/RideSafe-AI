import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { EmailModule } from './email/email.module';
import { FraudModule } from './fraud/fraud.module';
import { KycModule } from './kyc/kyc.module';
import { PrismaModule } from './prisma/prisma.module';
import { PlansModule } from './plans/plans.module';
import { PaymentsModule } from './payments/payments.module';
import { MockQCommerceModule } from './mock-qcommerce/mock-qcommerce.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    EmailModule,
    AuthModule,
    KycModule,
    FraudModule,
    PlansModule,
    PaymentsModule,
    MockQCommerceModule,
  ],
})
export class AppModule {}
