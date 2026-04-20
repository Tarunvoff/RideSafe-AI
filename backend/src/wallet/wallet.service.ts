import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class WalletService {
  constructor(private readonly prisma: PrismaService) {}

  async getEarnings(userId: string) {
    const payouts = await this.prisma.payout.findMany({
      where: { 
        policy: { userId },
        status: 'TRANSFERRED' // or generic 'SUCCESS'/'PAID' depending on model status values
      }
    });

    const total = payouts.reduce((sum, p) => sum + (p.approvedPayout || 0), 0);
    const pending = await this.prisma.payout.aggregate({
      where: { 
        policy: { userId },
        status: 'PROCESSING'
      },
      _sum: { approvedPayout: true }
    });

    return {
      balance: total,
      pending: pending._sum.approvedPayout || 0,
      currency: 'INR'
    };
  }
}
