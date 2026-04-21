import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { KYCStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { QCommerceProvider } from '../dynamic-qcommerce/enums/qcommerce.enums';

const MS_PER_DAY = 24 * 60 * 60 * 1000;
export const MIN_ENGAGEMENT_DAYS_STANDARD = 90;
export const MIN_ENGAGEMENT_DAYS_PREMIUM = 120;

function isEligibilityEnforced(): boolean {
  const explicit = (process.env.ENFORCE_DRIVER_ELIGIBILITY ?? '').trim().toLowerCase();
  if (explicit === 'true') return true;
  if (explicit === 'false') return false;
  return process.env.NODE_ENV === 'production';
}

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
  const [user, kycProfile] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, isVerified: true, createdAt: true, platform: true },
    }),
    prisma.kYCProfile.findUnique({
      where: { userId },
      select: { status: true },
    }),
  ]);

  if (!user) {
    throw new ForbiddenException('Driver account not found');
  }

  if (!user.isVerified) {
    throw new UnauthorizedException('Please verify your email before policy enrollment or payout processing.');
  }

  const engagementDays = resolveEngagementDaysSince(user.createdAt);
  const requiredDays = resolveRequiredEngagementDays(planKey);
  const oauthProviders = new Set<string>(Object.values(QCommerceProvider));
  const isOAuthUser = !!user.platform && oauthProviders.has(String(user.platform).toLowerCase());

  if (!isEligibilityEnforced()) {
    return {
      engagementDays,
      requiredDays,
      kycStatus: kycProfile?.status ?? KYCStatus.NOT_STARTED,
    };
  }

  if (isOAuthUser) {
    return {
      engagementDays,
      requiredDays,
      kycStatus: KYCStatus.APPROVED,
    };
  }

  const payoutSetup = await prisma.kYCPayoutSetup.findUnique({
    where: { userId },
    select: { financialDataConsent: true },
  });

  if (!kycProfile || kycProfile.status !== 'APPROVED') {
    console.warn(
      `[eligibility] KYC block userId=${userId} email=${user.email ?? 'unknown'} status=${kycProfile?.status ?? 'MISSING'} plan=${planKey ?? 'UNKNOWN'}`,
    );
    throw new ForbiddenException('KYC must be approved before policy enrollment or payout processing.');
  }

  if (!payoutSetup?.financialDataConsent) {
    throw new ForbiddenException('Explicit financial data consent is required before policy enrollment or payout processing.');
  }

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
