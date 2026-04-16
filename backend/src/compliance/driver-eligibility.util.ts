import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { KYCStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const MS_PER_DAY = 24 * 60 * 60 * 1000;
export const MIN_ENGAGEMENT_DAYS_STANDARD = 90;
export const MIN_ENGAGEMENT_DAYS_PREMIUM = 120;

function normalizePlanKey(planKey?: string | null): string {
  return String(planKey ?? '').trim().toUpperCase();
}

export function resolveRequiredEngagementDays(planKey?: string | null): number {
  return normalizePlanKey(planKey) === 'PREMIUM'
    ? MIN_ENGAGEMENT_DAYS_PREMIUM
    : MIN_ENGAGEMENT_DAYS_STANDARD;
}

export function resolveEngagementDaysSince(date: Date, now: Date = new Date()): number {
  const elapsedMs = Math.max(0, now.getTime() - date.getTime());
  return Math.floor(elapsedMs / MS_PER_DAY);
}

export async function assertDriverPolicyEligibility(
  prisma: PrismaService,
  userId: string,
  planKey?: string | null,
): Promise<{ engagementDays: number; requiredDays: number; kycStatus: KYCStatus }> {
  const [user, kycProfile, payoutSetup] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, isVerified: true, createdAt: true },
    }),
    prisma.kYCProfile.findUnique({
      where: { userId },
      select: { status: true },
    }),
    prisma.kYCPayoutSetup.findUnique({
      where: { userId },
      select: { financialDataConsent: true },
    }),
  ]);

  if (!user) {
    throw new ForbiddenException('Driver account not found');
  }

  if (!user.isVerified) {
    throw new UnauthorizedException('Please verify your email before policy enrollment or payout processing.');
  }

  if (!kycProfile || kycProfile.status !== 'APPROVED') {
    throw new ForbiddenException('KYC must be approved before policy enrollment or payout processing.');
  }

  if (!payoutSetup?.financialDataConsent) {
    throw new ForbiddenException('Explicit financial data consent is required before policy enrollment or payout processing.');
  }

  const engagementDays = resolveEngagementDaysSince(user.createdAt);
  const requiredDays = resolveRequiredEngagementDays(planKey);

  if (engagementDays < requiredDays) {
    throw new ForbiddenException(
      `Minimum platform engagement of ${requiredDays} days is required before policy enrollment or payout processing. Current tenure: ${engagementDays} days.`,
    );
  }

  return {
    engagementDays,
    requiredDays,
    kycStatus: kycProfile.status,
  };
}
