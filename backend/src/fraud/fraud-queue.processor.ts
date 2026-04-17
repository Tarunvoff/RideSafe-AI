import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { Logger } from '@nestjs/common';
import { NotificationService } from '../notifications/notification.service';

/**
 * FraudQueueProcessor: Orchestrates the "TTL with Auto-Action" logic.
 * If a fraud submission remains 'INCONCLUSIVE' beyond the 5-minute 
 * forensic window, this worker triggers a definitive 'AUTO_REJECTED' state.
 */
@Processor('fraud-review')
export class FraudQueueProcessor extends WorkerHost {
  private readonly logger = new Logger(FraudQueueProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationService,
  ) {
    super();
  }

  async process(job: Job<{ userId: string }, any, string>): Promise<any> {
    const { userId } = job.data;

    // Fetch latest state from the forensic core
    const analysis = await this.prisma.fraudAnalysis.findUnique({
      where: { userId },
      include: { user: true }
    });

    // Strategy: Only act if no analyst has touched the 'INCONCLUSIVE' state.
    if (!analysis || analysis.status !== 'INCONCLUSIVE') {
      this.logger.debug(`Bypassing auto-action for ${userId}: current status is ${analysis?.status}`);
      return { status: 'skipped', reason: 'already_resolved' };
    }

    // ── TTL EXPIRED ────────────────────────────────────────────────────────
    // 5-minute window reached. Enforce "Deny-by-Default" security posture.
    this.logger.warn(`Forensic window expired for ${userId}. Discharging Aegis Enforcement rejection.`);

    await this.prisma.fraudAnalysis.update({
      where: { userId },
      data: {
        status: 'AUTO_REJECTED',
        reviewedAt: new Date(),
        reviewNote: '[Aegis-Shield-TTL] Automated rejection: 5-minute forensic window expired without manual override.',
      },
    });

    // ── Notification (Real-time enforcement alert) ─────────────────────────
    await this.notifications.send({
      channel: 'SMS',
      type: 'PAYOUT_FAILED', // Using as a proxy for rejection notification
      recipient: analysis.user.phone ?? 'Unknown',
      payload: {},
      context: { userId, reason: 'Forensic TTL Expired' }
    });

    this.logger.log(`Compliance Alert: User ${userId} notified of automated rejection via the enforcement pipeline.`);
    
    return { status: 'rejected', user: userId };
  }
}
