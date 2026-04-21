import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ClaimsService {
  constructor(private readonly prisma: PrismaService) {}

  async getLatestStatus(userId: string) {
    const latestClaim = await this.prisma.payout.findFirst({
      where: { policy: { userId } },
      include: { disruptionEvent: true },
      orderBy: { createdAt: 'desc' }
    });

    if (!latestClaim) return null;

    return {
      id: latestClaim.id,
      status: latestClaim.status,
      amount: latestClaim.approvedPayout || 0,
      event: latestClaim.disruptionEvent?.type || 'Disruption',
      date: latestClaim.createdAt,
      ref: latestClaim.transactionId || 'Pending'
    };
  }

  async fileClaim(userId: string) {
    // In a real scenario, this would check if a disruption is active in the user's zone
    // For now, return instructions or simple acknowledgement
    return "Your claim request has been received. Our system is checking for verified disruptions in your zone. You will be notified automatically if a payout is triggered.";
  }
}
