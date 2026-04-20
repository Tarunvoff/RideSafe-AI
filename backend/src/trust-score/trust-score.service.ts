import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TrustScoreService {
  constructor(private readonly prisma: PrismaService) {}

  async getScore(userId: string) {
    const analysis = await this.prisma.fraudAnalysis.findUnique({
      where: { userId }
    });

    if (!analysis) return { score: 75, level: 'Good (Initial)', advice: 'Maintain consistent driving zones.' };

    const score = analysis.riskScore ? (100 - analysis.riskScore) : 85; // Mapping risk to trust
    let level = 'Medium';
    let advice = 'Keep your app active while driving.';

    if (score > 90) {
      level = 'Exceptional';
      advice = 'You are a top-tier driver! Eligibility for Premium plans is high.';
    } else if (score > 70) {
      level = 'Good';
      advice = 'Great consistency. Avoid high-risk zones during peak storms.';
    } else {
      level = 'Needs Improvement';
      advice = 'Try to stay within coverage zones to improve your score.';
    }

    return { score: Math.round(score), level, advice };
  }
}
