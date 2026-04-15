import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DisruptionBootstrapService implements OnModuleInit {
  private readonly logger = new Logger(DisruptionBootstrapService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    await this.ensureDefaultDisruptionExists();
  }

  private async ensureDefaultDisruptionExists() {
    const now = Date.now();
    const existingCount = await this.prisma.disruptionEvent.count({
      where: {
        verified: true,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } }
        ]
      }
    });

    if (existingCount === 0) {
      const occurredAt = new Date(now - 10 * 60 * 1000);
      const expiresAt = new Date(now + 7 * 24 * 60 * 60 * 1000); // 7 days

      await this.prisma.disruptionEvent.create({
        data: {
          type: 'RAIN',
          title: 'Heavy Rain Warning - Bengaluru',
          expectedLoss: 850,
          expectedPayout: 800,
          occurredAt,
          expiresAt,
          verified: true,
        },
      });

      this.logger.log('✅ Default disruption event created (no active events found)');
    } else {
      this.logger.log(`ℹ️  ${existingCount} active disruption event(s) already exist`);
    }
  }
}
