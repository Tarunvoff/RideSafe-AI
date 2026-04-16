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
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, isVerified: true, createdAt: true },
  });

  if (!user) {
    throw new ForbiddenException('Driver account not found');
  }

  if (!user.isVerified) {
    throw new UnauthorizedException('Please verify your email before policy enrollment.');
  }

  // Get KYC status for response (but don't enforce it for enrollment)
  const kycProfile = await prisma.kYCProfile.findUnique({
    where: { userId },
    select: { status: true },
  });

  const engagementDays = resolveEngagementDaysSince(user.createdAt);

  return {
    engagementDays,
    requiredDays: resolveRequiredEngagementDays(planKey),
    kycStatus: kycProfile?.status ?? 'NOT_STARTED',
  };
}
