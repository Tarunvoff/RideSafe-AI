import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisStateService } from '../state/redis-state.service';
import fetch from 'node-fetch';

@Injectable()
export class PostPayoutAuditService {
  private readonly logger = new Logger(PostPayoutAuditService.name);
  private readonly mlServiceUrl = process.env.ML_SERVICE_URL ?? 'http://localhost:8000';

  constructor(
    private readonly prisma: PrismaService,
    private readonly redisState: RedisStateService,
  ) {}

  /**
   * Performs an audit comparison between the ML's predicted risk
   * and the actual financial payout outcome.
   */
  async auditPayout(payoutId: string) {
    const payout = await this.prisma.payout.findUnique({
      where: { id: payoutId },
      include: { 
        policy: { select: { userId: true } },
        disruptionEvent: true 
      },
    });

    if (!payout || !payout.disruptionEvent) return;

    // Fetch the predicted risk from the time of payout from Redis or DB
    const driverState = await this.redisState.getDriverState(payout.policy.userId);
    const predictedRisk = driverState?.fraudScore ?? 0.5; // Fallback
    
    // Actual outcome: If it was approved, we assume it was a legitimate risk event (1.0)
    // If it was rejected later as fraud, outcome would be 0.0.
    const actualOutcome = payout.status === 'APPROVED' ? 1.0 : 0.0;

    await this.sendFeedbackToMl(payoutId, payout.policy.userId, predictedRisk, actualOutcome);
  }

  private async sendFeedbackToMl(
    payoutId: string, 
    driverId: string, 
    predicted: number, 
    actual: number
  ) {
    const driverState = await this.redisState.getDriverState(driverId);
    const h3Cell = driverState?.last_location?.h3_cell ?? 'unknown';

    try {
      const response = await fetch(`${this.mlServiceUrl}/feedback/payout-audit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payout_id: payoutId,
          predicted_risk: predicted,
          actual_outcome: actual,
          driver_id: driverId,
          h3_cell: h3Cell,
        }),
      });

      if (!response.ok) {
        this.logger.warn(`Failed to send payout feedback to ML: ${response.status}`);
      } else {
        const result = await response.json();
        this.logger.log(`ML Audit Loop: ${result.action} (error=${result.error_delta})`);
      }
    } catch (err) {
      this.logger.error(`Error in ML feedback loop: ${err.message}`);
    }
  }
}
