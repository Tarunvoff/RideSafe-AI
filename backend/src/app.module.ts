/** 
 * Modular Registry: The root application module that wires together identity, fraud detection, 
 * actuarial pricing, and the payout pipeline into a cohesive ecosystem.
 *
 * For a deep dive into the system design, refer to ARCHITECTURE/SYSTEM_ARCHITECTURE.md 
 * and ARCHITECTURE/OVERALL_PROJECT_SYSTEM_VIEW.md.
 */
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
import { WhatsappModule } from './whatsapp/whatsapp.module';
import { IvrModule } from './ivr/ivr.module';
import { TwilioModule } from './twilio-provider/twilio.module';
import { AssistantModule } from './assistant/assistant.module';
import { TokenRevocationMiddleware } from './auth/token-revocation.middleware';
import { BullModule } from '@nestjs/bullmq';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

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
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 20,
    }]),
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
    TwilioModule,
    AssistantModule,
    WhatsappModule,
    IvrModule,
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: Number(process.env.REDIS_PORT || 6379),
      },
    }),
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(TokenRevocationMiddleware)
      .forRoutes('*');
  }
}
