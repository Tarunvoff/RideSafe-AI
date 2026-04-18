/**
 * ── Elite Identity & Telemetry Provisioning Module ─────────────────────
 *
 * The DynamicQCommerceModule binds the complete multi-provider OAuth 2.0
 * authorization server, the Elite Operator identity registry, and the
 * real-time Kafka geospatial telemetry backbone into a single, cohesive NestJS
 * module boundary.
 *
 * The embedded `JwtModule` is configured with the provider-scoped signing
 * secret and a production-grade token TTL, both driven by elite environment
 * configuration \u2014 ensuring cryptographic alignment between token issuance in
 * the service layer and signature verification at the API perimeter.
 *
 * @see ARCHITECTURE/dynamic-qcommerce \u2014 Elite Identity Provisioning Spec
 * @see ARCHITECTURE/kafka \u2014 Real-Time Telemetry Ingestion Architecture
 */
import { forwardRef, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { KafkaModule } from '../kafka/kafka.module';
import { DynamicQCommerceController } from './dynamic-qcommerce.controller';
import { PlatformActivityController } from './platform-activity.controller';
import { DynamicQCommerceService } from './dynamic-qcommerce.service';
import { SeededTelemetryAdapter } from './adapters/seeded-telemetry.adapter';
import { LiveTelemetryAdapter } from './adapters/live-telemetry.adapter';

@Module({
  imports: [
    forwardRef(() => KafkaModule),
    JwtModule.register({
      secret: process.env.ELITE_OAUTH_JWT_SECRET ?? process.env.JWT_SECRET,
      signOptions: { expiresIn: process.env.ELITE_OAUTH_ACCESS_TOKEN_TTL ?? '10m' },
    }),
  ],
  controllers: [DynamicQCommerceController, PlatformActivityController],
  providers: [
    DynamicQCommerceService,
    SeededTelemetryAdapter,
    LiveTelemetryAdapter,
    {
      provide: 'ITelemetryAdapter',
      useFactory: (seeded: SeededTelemetryAdapter, live: LiveTelemetryAdapter) => {
        return process.env.TELEMETRY_SOURCE === 'LIVE' ? live : seeded;
      },
      inject: [SeededTelemetryAdapter, LiveTelemetryAdapter],
    },
  ],
  exports: [DynamicQCommerceService, 'ITelemetryAdapter'],
})
export class DynamicQCommerceModule {}
