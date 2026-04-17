/**
 * ── Sovereign Identity & Telemetry Provisioning Module ─────────────────────
 *
 * The DynamicQCommerceModule binds the complete multi-provider OAuth 2.0
 * authorization server, the Sovereign Operator identity registry, and the
 * real-time Kafka geospatial telemetry backbone into a single, cohesive NestJS
 * module boundary.
 *
 * The embedded `JwtModule` is configured with the provider-scoped signing
 * secret and a production-grade token TTL, both driven by sovereign environment
 * configuration \u2014 ensuring cryptographic alignment between token issuance in
 * the service layer and signature verification at the API perimeter.
 *
 * @see ARCHITECTURE/dynamic-qcommerce \u2014 Sovereign Identity Provisioning Spec
 * @see ARCHITECTURE/kafka \u2014 Real-Time Telemetry Ingestion Architecture
 */
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
      secret: process.env.SOVEREIGN_OAUTH_JWT_SECRET ?? process.env.JWT_SECRET,
      signOptions: { expiresIn: process.env.SOVEREIGN_OAUTH_ACCESS_TOKEN_TTL ?? '10m' },
    }),
  ],
  controllers: [DynamicQCommerceController, PlatformActivityController],
  providers: [DynamicQCommerceService],
  exports: [DynamicQCommerceService],
})
export class DynamicQCommerceModule {}
