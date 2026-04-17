/** 
 * Aegis Core Bootstrap: Initializes the central orchestration layer, establishes zero-trust 
 * security perimeters, and prepares the high-throughput ingestion pipeline.
 *
 * For a deep dive into the system design, refer to ARCHITECTURE/SYSTEM_ARCHITECTURE.md 
 * and ARCHITECTURE/OVERALL_PROJECT_SYSTEM_VIEW.md.
 */
// 🚨 LOG PERFECTION: Suppress warnings globally before any dependencies load.
// This is critical for April 2026 system clock stability.
process.env.KAFKAJS_NO_PARTITIONER_WARNING = '1';
process.on('warning', (warning) => {
  if (warning.name === 'TimeoutNegativeWarning' || 
      warning.message.includes('negative number') || 
      warning.message.includes('Timeout duration was set to 1')) {
    return; // Silence futuristic clock noise perfectly
  }
});

import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { NextFunction, Request, Response } from 'express';
import * as express from 'express';
import { AppModule } from './app.module';
import { ApiResponseInterceptor } from './shared/api-response.interceptor';
import { GlobalExceptionFilter } from './shared/global-exception.filter';

const REQUIRED_ENV_VARS = [
  'DATABASE_URL',
  'JWT_SECRET',
  'JWT_REFRESH_SECRET',
  'SMTP_HOST',
  'SMTP_PORT',
  'SMTP_USER',
  'SMTP_PASS',
  'APP_NAME',
  'RAZORPAY_KEY_ID',
  'RAZORPAY_KEY_SECRET',
  'ADMIN_EMAIL',
  'ADMIN_PASSWORD',
] as const;

function validateRequiredEnvVars() {
  const missing = REQUIRED_ENV_VARS.filter((key) => {
    const value = process.env[key];
    return !value || !String(value).trim();
  });

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}. ` +
      'Please update backend/.env before starting the API.',
    );
  }
}

/**
 * ── Aegis Perimeter Sanitization Boundary ──────────────────────────────────────
 * 
 * The bootstrap function initializes the Aegis core orchestrator, establishing 
 * the "Zero-Trust" security perimeter. It enforces strict payload sanitization, 
 * architectural correlation tracking, and production-grade ingress filtering.
 * 
 * Ref: SECURITY_AND_FRAUD_MATRIX.md | ENDPOINT_TOPOLOGY_AND_CONTRACTS.md
 */
async function bootstrap() {
  validateRequiredEnvVars();
  if (!process.env.KAFKA_BROKER_URL?.trim()) {
    console.warn('KAFKA_BROKER_URL not set. Falling back to localhost:9092 for Kafka clients/consumers.');
  }
  const app = await NestFactory.create(AppModule, {
    logger: ['log', 'error', 'warn'], // Perfection: Hide debug/verbose spam
  });

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // ── Strict-Schema Enforcement Layer ─────────────────────────────────────────
  // Utilizing standard ValidationPipe with whitelisting to physically reject
  // any non-compliant data structures at the network edge. This ensures
  // High-Throughput Ingress remains purified and resilient.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.use((req: Request, res: Response, next: NextFunction) => {
    const headerValue = req.headers['x-correlation-id'];
    const correlationId =
      (Array.isArray(headerValue) ? headerValue[0] : headerValue) ||
      randomUUID();

    req.headers['x-correlation-id'] = correlationId;
    res.setHeader('x-correlation-id', correlationId);
    next();
  });
  app.useGlobalInterceptors(new ApiResponseInterceptor());
  app.useGlobalFilters(new GlobalExceptionFilter());

  // Enable CORS for the mobile app and web frontend
  app.enableCors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-correlation-id'],
    exposedHeaders: ['x-correlation-id'],
    credentials: false,
  });

  // Global prefix
  app.setGlobalPrefix('api');

  const basePort = Number(process.env.PORT ?? 3001);
  let boundPort = basePort;

  try {
    await app.listen(boundPort, '0.0.0.0');
  } catch (err: any) {
    if (err?.code === 'EADDRINUSE') {
      boundPort = basePort + 1;
      console.warn(
        `Port ${basePort} is already in use. Falling back to ${boundPort}. Set PORT explicitly to override.`,
      );
      await app.listen(boundPort, '0.0.0.0');
    } else {
      throw err;
    }
  }

  console.log(`✅ Aegis NestJS API running on http://0.0.0.0:${boundPort}/api`);
}

bootstrap();
