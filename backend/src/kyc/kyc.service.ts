import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BasicIdentityDto, IdentityVerificationDto, PayoutSetupDto, PersonalDetailsDto } from './dto/kyc.dto';
import {
  MIN_ENGAGEMENT_DAYS_STANDARD,
  MIN_ENGAGEMENT_DAYS_PREMIUM,
  resolveEngagementDaysSince,
} from '../compliance/driver-eligibility.util';

@Injectable()
export class KycService {
  constructor(private prisma: PrismaService) {}

  // ── GET STATUS ───────────────────────────────────────────────────────────
  async getStatus(userId: string) {
    const [profile, user] = await Promise.all([
      this.prisma.kYCProfile.findUnique({ where: { userId } }),
      this.prisma.user.findUnique({ where: { id: userId }, select: { createdAt: true } }),
    ]);
    if (!profile) throw new NotFoundException('KYC profile not found. Please register first.');
    if (!user) throw new NotFoundException('User not found. Please register first.');

    const [basicIdentity, personalDetails, identityVerification, payoutSetup] = await Promise.all([
      this.prisma.kYCBasicIdentity.findUnique({ where: { userId } }),
      this.prisma.kYCPersonalDetails.findUnique({ where: { userId } }),
      this.prisma.kYCIdentityVerification.findUnique({ where: { userId } }),
      this.prisma.kYCPayoutSetup.findUnique({ where: { userId } }),
    ]);

    const steps = {
      basicIdentity: !!basicIdentity,
      personalDetails: !!personalDetails,
      identityVerification: !!identityVerification,
      payoutSetup: !!payoutSetup,
    };

    const completedSteps = Object.values(steps).filter(Boolean).length;
    const engagementDays = resolveEngagementDaysSince(user.createdAt);

    return {
      status: profile.status,
      submittedAt: profile.submittedAt,
      completedSteps,
      totalSteps: 4,
      steps,
      engagementEligibility: {
        engagementDays,
        minimumDays: {
          standard: MIN_ENGAGEMENT_DAYS_STANDARD,
          premium: MIN_ENGAGEMENT_DAYS_PREMIUM,
        },
        eligibleForStandard: engagementDays >= MIN_ENGAGEMENT_DAYS_STANDARD,
        eligibleForPremium: engagementDays >= MIN_ENGAGEMENT_DAYS_PREMIUM,
      },
    };
  }

  // ── STEP 1: BASIC IDENTITY ───────────────────────────────────────────────
  async saveBasicIdentity(userId: string, dto: BasicIdentityDto) {
    const data = {
      userId,
      fullName: dto.fullName,
      dob: new Date(dto.dob),
      gender: dto.gender,
    };

    const existing = await this.prisma.kYCBasicIdentity.findUnique({ where: { userId } });
    const result = existing
      ? await this.prisma.kYCBasicIdentity.update({ where: { userId }, data })
      : await this.prisma.kYCBasicIdentity.create({ data });

    await this.updateKycStatus(userId);
    return { message: 'Basic identity saved.', data: result };
  }

  // ── STEP 2: PERSONAL DETAILS ─────────────────────────────────────────────
  async savePersonalDetails(userId: string, dto: PersonalDetailsDto) {
    const data = { userId, ...dto };
    const existing = await this.prisma.kYCPersonalDetails.findUnique({ where: { userId } });
    const result = existing
      ? await this.prisma.kYCPersonalDetails.update({ where: { userId }, data })
      : await this.prisma.kYCPersonalDetails.create({ data });

    await this.updateKycStatus(userId);
    return { message: 'Personal details saved.', data: result };
  }

  // ── STEP 3: IDENTITY VERIFICATION ───────────────────────────────────────
  async saveIdentityVerification(userId: string, dto: IdentityVerificationDto) {
    const data = { userId, ...dto };
    const existing = await this.prisma.kYCIdentityVerification.findUnique({ where: { userId } });
    const result = existing
      ? await this.prisma.kYCIdentityVerification.update({ where: { userId }, data })
      : await this.prisma.kYCIdentityVerification.create({ data });

    await this.updateKycStatus(userId);
    return { message: 'Identity verification saved.', data: result };
  }

  // ── STEP 4: PAYOUT SETUP ─────────────────────────────────────────────────
  async savePayoutSetup(userId: string, dto: PayoutSetupDto) {
    if (dto.method === 'UPI' && !dto.upiId) {
      throw new BadRequestException('UPI ID is required for UPI payout method.');
    }
    if (dto.method === 'BANK' && (!dto.accountNumber || !dto.ifscCode || !dto.accountHolder)) {
      throw new BadRequestException('Account number, IFSC code, and account holder name are required for bank payout.');
    }

    const data = {
      userId,
      method: dto.method,
      upiId: dto.upiId,
      accountNumber: dto.accountNumber,
      ifscCode: dto.ifscCode,
      accountHolder: dto.accountHolder,
      bankName: dto.bankName,
      financialDataConsent: true,
      financialDataConsentAt: new Date(),
      consentVersion: dto.consentVersion,
    };
    const existing = await this.prisma.kYCPayoutSetup.findUnique({ where: { userId } });
    const result = existing
      ? await this.prisma.kYCPayoutSetup.update({ where: { userId }, data })
      : await this.prisma.kYCPayoutSetup.create({ data });

    await this.updateKycStatus(userId);
    return { message: 'Payout setup saved.', data: result };
  }

  // ── SUBMIT KYC ───────────────────────────────────────────────────────────
  async submit(userId: string) {
    const [basicIdentity, personalDetails, identityVerification, payoutSetup] = await Promise.all([
      this.prisma.kYCBasicIdentity.findUnique({ where: { userId } }),
      this.prisma.kYCPersonalDetails.findUnique({ where: { userId } }),
      this.prisma.kYCIdentityVerification.findUnique({ where: { userId } }),
      this.prisma.kYCPayoutSetup.findUnique({ where: { userId } }),
    ]);

    if (!basicIdentity || !personalDetails || !identityVerification || !payoutSetup) {
      throw new BadRequestException('Please complete all KYC steps before submitting.');
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { createdAt: true } });
    if (!user) {
      throw new NotFoundException('User not found. Please register first.');
    }

    const engagementDays = resolveEngagementDaysSince(user.createdAt);
    if (engagementDays < MIN_ENGAGEMENT_DAYS_STANDARD) {
      throw new BadRequestException(
        `Minimum platform engagement of ${MIN_ENGAGEMENT_DAYS_STANDARD} days is required before KYC submission. Current tenure: ${engagementDays} days.`,
      );
    }

    const profile = await this.prisma.kYCProfile.update({
      where: { userId },
      data: { status: 'SUBMITTED', submittedAt: new Date() },
    });

    return { message: 'KYC submitted successfully! Our team will review it within 1-2 business days.', profile };
  }

  // ── DRIVER: GET OWN KYC DETAILS ─────────────────────────────────────────
  async getDriverDetails(userId: string) {
    const [profile, basicIdentity, personalDetails, identityVerification, payoutSetup] = await Promise.all([
      this.prisma.kYCProfile.findUnique({ where: { userId } }),
      this.prisma.kYCBasicIdentity.findUnique({ where: { userId } }),
      this.prisma.kYCPersonalDetails.findUnique({ where: { userId } }),
      this.prisma.kYCIdentityVerification.findUnique({ where: { userId } }),
      this.prisma.kYCPayoutSetup.findUnique({ where: { userId } }),
    ]);

    return {
      status: profile?.status ?? 'NOT_STARTED',
      submittedAt: profile?.submittedAt ?? null,
      reviewedAt: profile?.reviewedAt ?? null,
      basicIdentity: basicIdentity ? {
        fullName: basicIdentity.fullName,
        dob: basicIdentity.dob,
        gender: basicIdentity.gender,
      } : null,
      personalDetails: personalDetails ? {
        address: personalDetails.address,
        city: personalDetails.city,
        state: personalDetails.state,
        pincode: personalDetails.pincode,
      } : null,
      identityVerification: identityVerification ? {
        aadhaarNumber: identityVerification.aadhaarNumber,
        panNumber: identityVerification.panNumber,
      } : null,
      payoutSetup: payoutSetup ? {
        method: payoutSetup.method,
        upiId: payoutSetup.upiId,
        accountHolder: payoutSetup.accountHolder,
        bankName: payoutSetup.bankName,
        financialDataConsent: payoutSetup.financialDataConsent,
        financialDataConsentAt: payoutSetup.financialDataConsentAt,
        consentVersion: payoutSetup.consentVersion,
      } : null,
    };
  }

  // ── ADMIN: GET ALL SUBMISSIONS ───────────────────────────────────────────
  async getSubmissions() {
    const submissions = await this.prisma.kYCProfile.findMany({
      where: { status: 'SUBMITTED' },
      include: {
        user: {
          select: { id: true, email: true, phone: true, createdAt: true },
        },
      },
      orderBy: { submittedAt: 'asc' },
    });

    return {
      total: submissions.length,
      submissions: submissions.map(sub => ({
        profileId: sub.id,
        userId: sub.userId,
        email: sub.user.email,
        phone: sub.user.phone,
        status: sub.status,
        submittedAt: sub.submittedAt,
        userCreatedAt: sub.user.createdAt,
      })),
    };
  }

  // ── ADMIN: GET SUBMISSION DETAILS ────────────────────────────────────────
  async getSubmissionDetails(userId: string) {
    const profile = await this.prisma.kYCProfile.findUnique({
      where: { userId },
      include: {
        user: {
          select: { id: true, email: true, phone: true },
        },
      },
    });

    if (!profile) throw new NotFoundException('KYC profile not found');

    const [basicIdentity, personalDetails, identityVerification, payoutSetup] = await Promise.all([
      this.prisma.kYCBasicIdentity.findUnique({ where: { userId } }),
      this.prisma.kYCPersonalDetails.findUnique({ where: { userId } }),
      this.prisma.kYCIdentityVerification.findUnique({ where: { userId } }),
      this.prisma.kYCPayoutSetup.findUnique({ where: { userId } }),
    ]);

    return {
      profile: {
        id: profile.id,
        status: profile.status,
        submittedAt: profile.submittedAt,
        reviewedAt: profile.reviewedAt,
        reviewNote: profile.reviewNote,
      },
      user: profile.user,
      kyc: {
        basicIdentity: basicIdentity ? {
          id: basicIdentity.id,
          fullName: basicIdentity.fullName,
          dob: basicIdentity.dob,
          gender: basicIdentity.gender,
        } : null,
        personalDetails: personalDetails ? {
          id: personalDetails.id,
          address: personalDetails.address,
          city: personalDetails.city,
          state: personalDetails.state,
          pincode: personalDetails.pincode,
        } : null,
        identityVerification: identityVerification ? {
          id: identityVerification.id,
          aadhaarNumber: identityVerification.aadhaarNumber,
          panNumber: identityVerification.panNumber,
          aadhaarDocUrl: identityVerification.aadhaarDocUrl,
          panDocUrl: identityVerification.panDocUrl,
        } : null,
        payoutSetup: payoutSetup ? {
          id: payoutSetup.id,
          method: payoutSetup.method,
          upiId: payoutSetup.upiId,
          accountNumber: payoutSetup.accountNumber,
          ifscCode: payoutSetup.ifscCode,
          accountHolder: payoutSetup.accountHolder,
          bankName: payoutSetup.bankName,
          financialDataConsent: payoutSetup.financialDataConsent,
          financialDataConsentAt: payoutSetup.financialDataConsentAt,
          consentVersion: payoutSetup.consentVersion,
        } : null,
      },
    };
  }

  // ── ADMIN: REVIEW SUBMISSION ─────────────────────────────────────────────
  async reviewSubmission(userId: string, status: 'APPROVED' | 'REJECTED', reviewNote?: string) {
    if (!['APPROVED', 'REJECTED'].includes(status)) {
      throw new BadRequestException('Invalid status. Must be APPROVED or REJECTED.');
    }

    const profile = await this.prisma.kYCProfile.update({
      where: { userId },
      data: {
        status,
        reviewedAt: new Date(),
        reviewNote: reviewNote || null,
      },
    });

    return {
      message: `KYC ${status.toLowerCase()} successfully.`,
      profile: {
        userId: profile.userId,
        status: profile.status,
        reviewedAt: profile.reviewedAt,
        reviewNote: profile.reviewNote,
      },
    };
  }

  // ── HELPER: UPDATE KYC STATUS ────────────────────────────────────────────
  private async updateKycStatus(userId: string) {
    const profile = await this.prisma.kYCProfile.findUnique({ where: { userId } });
    if (profile?.status === 'NOT_STARTED') {
      await this.prisma.kYCProfile.update({ where: { userId }, data: { status: 'IN_PROGRESS' } });
    }
  }
}
