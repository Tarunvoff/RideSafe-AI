import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { IngestionModule } from './ingestion/ingestion.module';
import { TelemetryModule } from './telemetry/telemetry.module';
import { AuthModule } from './auth/auth.module';
import { EmailModule } from './email/email.module';
import { FraudModule } from './fraud/fraud.module';
import { KycModule } from './kyc/kyc.module';
import { PrismaModule } from './prisma/prisma.module';
import { PlansModule } from './plans/plans.module';
import { PaymentsModule } from './payments/payments.module';
import { DynamicQCommerceModule } from './dynamic-qcommerce/dynamic-qcommerce.module';
import { PremiumModule } from './premium/premium.module';
import { TriggerModule } from './trigger/trigger.module';
import { PayoutModule } from './payout/payout.module';
import { InsuranceModule } from './insurance/insurance.module';
import { AdminModule } from './admin/admin.module';
import { SupportModule } from './support/support.module';
import { NotificationsModule } from './notifications/notifications.module';
import { CanonicalModule } from './canonical/canonical.module';
import { StateModule } from './state/state.module';
import { RiskMonitorModule } from './risk-monitor/risk-monitor.module';
import { ComplianceModule } from './compliance/compliance.module';
import { TokenRevocationMiddleware } from './auth/token-revocation.middleware';
import { BullModule } from '@nestjs/bullmq';

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
    ScheduleModule.forRoot(),
    IngestionModule,
    TelemetryModule,
    DynamicQCommerceModule,
    PremiumModule,
    TriggerModule,
    PayoutModule,
    InsuranceModule,
    AdminModule,
    SupportModule,
    NotificationsModule,
    CanonicalModule,
    StateModule,
    RiskMonitorModule,
    ComplianceModule,
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: Number(process.env.REDIS_PORT || 6379),
      },
    }),
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(TokenRevocationMiddleware)
      .forRoutes('*');
  }
}
