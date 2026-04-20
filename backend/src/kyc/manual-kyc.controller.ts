import { BadRequestException, Body, Controller, Get, HttpCode, HttpStatus, Logger, Param, Post } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

type ManualDocState = {
  url?: string;
  status: 'pending' | 'verified' | 'rejected';
};

type ManualMeta = {
  profile?: {
    vehicleType?: string;
    platformId?: string;
  };
  documents?: {
    pan?: ManualDocState;
    aadhaarFront?: ManualDocState;
    aadhaarBack?: ManualDocState;
    drivingLicense?: ManualDocState;
    bankProof?: ManualDocState;
  };
};

@Controller('kyc/manual')
export class ManualKycController {
  private readonly logger = new Logger(ManualKycController.name);

  constructor(private readonly prisma: PrismaService) {}

  private async loadMeta(userId: string): Promise<ManualMeta> {
    const profile = await this.prisma.kYCProfile.findUnique({ where: { userId } });
    if (!profile) {
      await this.prisma.kYCProfile.create({ data: { userId, status: 'IN_PROGRESS' } });
      return { documents: {} };
    }

    if (!profile.reviewNote) return { documents: {} };
    try {
      const parsed = JSON.parse(profile.reviewNote);
      return typeof parsed === 'object' && parsed ? parsed : { documents: {} };
    } catch {
      return { documents: {} };
    }
  }

  private async saveMeta(userId: string, meta: ManualMeta, status: 'NOT_STARTED' | 'IN_PROGRESS' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' = 'IN_PROGRESS') {
    await this.prisma.kYCProfile.upsert({
      where: { userId },
      create: { userId, status, reviewNote: JSON.stringify(meta) },
      update: { status, reviewNote: JSON.stringify(meta) },
    });
  }

  @Post('upload/pan')
  @HttpCode(HttpStatus.OK)
  async uploadPan(@Body() dto: { userId: string; panImageUrl: string }) {
    if (!dto?.userId || !dto?.panImageUrl) throw new BadRequestException('userId and panImageUrl are required');
    const meta = await this.loadMeta(dto.userId);
    meta.documents = {
      ...(meta.documents || {}),
      pan: { url: dto.panImageUrl, status: 'pending' },
    };

    await this.prisma.kYCIdentityVerification.upsert({
      where: { userId: dto.userId },
      create: { userId: dto.userId, aadhaarNumber: 'PENDING', panNumber: 'PENDING', panDocUrl: dto.panImageUrl },
      update: { panDocUrl: dto.panImageUrl },
    });

    await this.saveMeta(dto.userId, meta);
    return { message: 'PAN uploaded' };
  }

  @Post('upload/aadhaar')
  @HttpCode(HttpStatus.OK)
  async uploadAadhaar(@Body() dto: { userId: string; aadhaarFrontUrl: string; aadhaarBackUrl: string }) {
    if (!dto?.userId || !dto?.aadhaarFrontUrl || !dto?.aadhaarBackUrl) {
      throw new BadRequestException('userId, aadhaarFrontUrl and aadhaarBackUrl are required');
    }
    const meta = await this.loadMeta(dto.userId);
    meta.documents = {
      ...(meta.documents || {}),
      aadhaarFront: { url: dto.aadhaarFrontUrl, status: 'pending' },
      aadhaarBack: { url: dto.aadhaarBackUrl, status: 'pending' },
    };

    await this.prisma.kYCIdentityVerification.upsert({
      where: { userId: dto.userId },
      create: {
        userId: dto.userId,
        aadhaarNumber: 'PENDING',
        panNumber: 'PENDING',
        aadhaarDocUrl: dto.aadhaarFrontUrl,
      },
      update: {
        aadhaarDocUrl: dto.aadhaarFrontUrl,
      },
    });

    await this.saveMeta(dto.userId, meta);
    return { message: 'Aadhaar uploaded' };
  }

  @Post('upload/dl')
  @HttpCode(HttpStatus.OK)
  async uploadDl(@Body() dto: { userId: string; dlImageUrl: string }) {
    if (!dto?.userId || !dto?.dlImageUrl) throw new BadRequestException('userId and dlImageUrl are required');
    const meta = await this.loadMeta(dto.userId);
    meta.documents = {
      ...(meta.documents || {}),
      drivingLicense: { url: dto.dlImageUrl, status: 'pending' },
    };
    await this.saveMeta(dto.userId, meta);
    return { message: 'Driving license uploaded' };
  }

  @Post('upload/bank')
  @HttpCode(HttpStatus.OK)
  async uploadBank(
    @Body()
    dto: {
      userId: string;
      bankDetails: {
        accountNumber?: string;
        ifscCode?: string;
        passbookOrChequeImageUrl?: string;
      };
    },
  ) {
    if (!dto?.userId) throw new BadRequestException('userId is required');
    const meta = await this.loadMeta(dto.userId);
    const bankProofUrl = dto?.bankDetails?.passbookOrChequeImageUrl;
    meta.documents = {
      ...(meta.documents || {}),
      bankProof: { url: bankProofUrl, status: 'pending' },
    };

    await this.prisma.kYCPayoutSetup.upsert({
      where: { userId: dto.userId },
      create: {
        userId: dto.userId,
        method: 'BANK',
        financialDataConsent: true,
        financialDataConsentAt: new Date(),
        consentVersion: 'manual-v1',
        accountNumber: dto.bankDetails.accountNumber || null,
        ifscCode: dto.bankDetails.ifscCode || null,
        accountHolder: 'PENDING',
        bankName: 'PENDING',
      },
      update: {
        accountNumber: dto.bankDetails.accountNumber || undefined,
        ifscCode: dto.bankDetails.ifscCode || undefined,
      },
    });

    await this.saveMeta(dto.userId, meta);
    return { message: 'Bank details uploaded' };
  }

  @Post('submit')
  @HttpCode(HttpStatus.OK)
  async submit(@Body() dto: { userId: string; platformId?: string }) {
    if (!dto?.userId) throw new BadRequestException('userId is required');
    const meta = await this.loadMeta(dto.userId);
    meta.profile = {
      ...(meta.profile || {}),
      platformId: dto.platformId,
    };
    await this.saveMeta(dto.userId, meta, 'SUBMITTED');
    await this.prisma.kYCProfile.update({
      where: { userId: dto.userId },
      data: { submittedAt: new Date() },
    });

    // Admin dashboard currently reads verification queue from fraud submissions.
    // Mirror manual KYC request there so admin can review immediately.
    await this.prisma.fraudAnalysis.upsert({
      where: { userId: dto.userId },
      create: {
        userId: dto.userId,
        riskScore: 0,
        status: 'INCONCLUSIVE',
        analysisDetails: JSON.stringify({
          source: 'manual_kyc_submission',
          requestType: 'KYC_VERIFICATION',
          priority: 'NORMAL',
        }),
      },
      update: {
        status: 'INCONCLUSIVE',
        reviewNote: 'Manual KYC submitted. Pending admin verification.',
        reviewedAt: null,
        analysisDetails: JSON.stringify({
          source: 'manual_kyc_submission',
          requestType: 'KYC_VERIFICATION',
          priority: 'NORMAL',
          submittedAt: new Date().toISOString(),
        }),
      },
    });

    try {
      const admins = await this.prisma.user.findMany({
        where: { role: 'ADMIN' },
        select: { id: true },
      });

      if (admins.length) {
        await this.prisma.notification.createMany({
          data: admins.map((admin) => ({
            userId: admin.id,
            eventType: 'SYSTEM',
            message: `New manual KYC verification request for user ${dto.userId}`,
            metadata: {
              type: 'KYC_VERIFICATION_REQUEST',
              userId: dto.userId,
            } as any,
            isRead: false,
          })),
          skipDuplicates: true,
        });
      }
    } catch (error) {
      this.logger.warn(`Failed to enqueue admin notification for manual KYC submit: ${String(error)}`);
    }

    return { message: 'KYC submitted for review', status: 'pending' };
  }

  @Get('status/:userId')
  @HttpCode(HttpStatus.OK)
  async getStatus(@Param('userId') userId: string) {
    const profile = await this.prisma.kYCProfile.findUnique({ where: { userId } });
    const meta = await this.loadMeta(userId);
    const status = profile?.status ?? 'NOT_STARTED';
    const normalizedStatus = status === 'APPROVED' ? 'verified' : status === 'REJECTED' ? 'rejected' : 'pending';

    const docs = meta.documents || {};
    const docStatuses = {
      pan: docs.pan?.status || 'pending',
      aadhaar: (docs.aadhaarFront?.status === 'verified' || docs.aadhaarBack?.status === 'verified') ? 'verified' : 'pending',
      dl: docs.drivingLicense?.status || 'pending',
      bank: docs.bankProof?.status || 'pending',
    };

    return {
      status: normalizedStatus,
      verificationNotes: profile?.reviewNote || undefined,
      documents: docs,
      documentStatuses: docStatuses,
    };
  }
}
