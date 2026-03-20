import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AnalyzeFraudDto, ReviewFraudDto } from './dto/fraud.dto';

@Injectable()
export class FraudService {
  constructor(private prisma: PrismaService) {}

  async analyzeFraud(userId: string, dto: AnalyzeFraudDto) {
    // Simulate fraud detection algorithm
    const riskScore = this.calculateRiskScore(dto);
    const status = riskScore > 60 ? 'INCONCLUSIVE' : 'APPROVED';

    const existing = await (this.prisma as any).fraudAnalysis.findUnique({ where: { userId } });
    const result = existing
      ? await (this.prisma as any).fraudAnalysis.update({
          where: { userId },
          data: {
            gpsLatitude: dto.gpsLatitude,
            gpsLongitude: dto.gpsLongitude,
            riskScore,
            status,
            deviceIntegrity: dto.deviceIntegrity || null,
            networkType: dto.networkType || null,
            velocityCheck: dto.velocityCheck || null,
            analysisDetails: JSON.stringify(this.getAnalysisDetails(dto, riskScore)),
          },
        })
      : await (this.prisma as any).fraudAnalysis.create({
          data: {
            userId,
            gpsLatitude: dto.gpsLatitude,
            gpsLongitude: dto.gpsLongitude,
            riskScore,
            status,
            deviceIntegrity: dto.deviceIntegrity || null,
            networkType: dto.networkType || null,
            velocityCheck: dto.velocityCheck || null,
            analysisDetails: JSON.stringify(this.getAnalysisDetails(dto, riskScore)),
          },
        });

    return {
      message: 'Fraud analysis completed',
      data: {
        id: result.id,
        riskScore: result.riskScore,
        status: result.status,
        analysis: JSON.parse(result.analysisDetails || '{}'),
      },
    };
  }

  async getStatus(userId: string) {
    const analysis = await (this.prisma as any).fraudAnalysis.findUnique({ where: { userId } });
    if (!analysis) {
      return { status: 'PENDING', riskScore: 0, message: 'No analysis found' };
    }

    return {
      status: analysis.status,
      riskScore: analysis.riskScore,
      deviceIntegrity: analysis.deviceIntegrity,
      networkType: analysis.networkType,
      velocityCheck: analysis.velocityCheck,
      analysis: JSON.parse(analysis.analysisDetails || '{}'),
    };
  }

  async getSubmissions() {
    const submissions = await (this.prisma as any).fraudAnalysis.findMany({
      where: { status: 'INCONCLUSIVE' },
      include: {
        user: {
          select: { id: true, email: true, phone: true, createdAt: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      total: submissions.length,
      submissions: submissions.map(sub => ({
        analysisId: sub.id,
        userId: sub.userId,
        email: sub.user.email,
        phone: sub.user.phone,
        riskScore: sub.riskScore,
        status: sub.status,
        createdAt: sub.createdAt,
      })),
    };
  }

  async getSubmissionDetails(userId: string) {
    const analysis = await (this.prisma as any).fraudAnalysis.findUnique({
      where: { userId },
      include: {
        user: {
          select: { id: true, email: true, phone: true },
        },
      },
    });

    if (!analysis) throw new NotFoundException('Fraud analysis not found');

    return {
      analysis: {
        id: analysis.id,
        riskScore: analysis.riskScore,
        status: analysis.status,
        gpsLatitude: analysis.gpsLatitude,
        gpsLongitude: analysis.gpsLongitude,
        deviceIntegrity: analysis.deviceIntegrity,
        networkType: analysis.networkType,
        velocityCheck: analysis.velocityCheck,
        details: JSON.parse(analysis.analysisDetails || '{}'),
        createdAt: analysis.createdAt,
      },
      user: analysis.user,
    };
  }

  async reviewSubmission(userId: string, dto: ReviewFraudDto) {
    const analysis = await (this.prisma as any).fraudAnalysis.update({
      where: { userId },
      data: {
        status: dto.status,
        reviewedAt: new Date(),
        reviewNote: dto.reviewNote || null,
      },
    });

    return {
      message: `Fraud analysis ${dto.status.toLowerCase()} successfully`,
      data: {
        userId: analysis.userId,
        status: analysis.status,
        reviewedAt: analysis.reviewedAt,
        reviewNote: analysis.reviewNote,
      },
    };
  }

  private calculateRiskScore(dto: AnalyzeFraudDto): number {
    let score = 0;

    // GPS spoofing indicators
    if (dto.gpsLatitude === 0 && dto.gpsLongitude === 0) score += 30;
    if (Math.abs(dto.gpsLatitude) > 90 || Math.abs(dto.gpsLongitude) > 180) score += 40;

    // Device integrity
    if (dto.deviceIntegrity === 'Rooted Device') score += 20;
    if (dto.deviceIntegrity === 'Jailbroken Device') score += 25;

    // Network type
    if (dto.networkType === 'Premium VPN') score += 15;
    if (dto.networkType === 'Proxy') score += 25;

    // Velocity check
    if (dto.velocityCheck === 'Suspicious') score += 20;

    return Math.min(score, 100);
  }

  private getAnalysisDetails(dto: AnalyzeFraudDto, riskScore: number) {
    const details: any = {
      gpsCoordinates: `${dto.gpsLatitude}, ${dto.gpsLongitude}`,
      riskFactors: [],
    };

    if (riskScore > 60) {
      details.riskFactors.push('GPS signals exhibit inconsistent timing offsets');
      details.riskFactors.push('Non-linear movement telemetry detected');
    }

    if (dto.deviceIntegrity === 'Rooted Device') {
      details.riskFactors.push('Device integrity compromised');
    }

    if (dto.networkType === 'Premium VPN') {
      details.riskFactors.push('Premium VPN detected');
    }

    return details;
  }
}
