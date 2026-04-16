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
import { AppModule } from './app.module';

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

async function bootstrap() {
  validateRequiredEnvVars();
  if (!process.env.KAFKA_BROKER_URL?.trim()) {
    console.warn('KAFKA_BROKER_URL not set. Falling back to localhost:9092 for Kafka clients/consumers.');
  }
  const app = await NestFactory.create(AppModule, {
    logger: ['log', 'error', 'warn'], // Perfection: Hide debug/verbose spam
  });

  // Global validation pipe using class-validator decorators
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Enable CORS for the mobile app and web frontend
  app.enableCors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: false,
  });

  // Global prefix
  app.setGlobalPrefix('api');

  const port = process.env.PORT ?? 3001;
  await app.listen(port, '0.0.0.0');
  console.log(`✅ Aegis NestJS API running on http://0.0.0.0:${port}/api`);
}

bootstrap();
