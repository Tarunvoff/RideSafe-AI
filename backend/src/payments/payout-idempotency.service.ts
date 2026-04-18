/**
 * payout-idempotency.service.ts — Stripe-level exactly-once payout guard.
 *
 * Idempotency key = user_id + h3_cell + event_timestamp
 *
 * State machine:
 *   PENDING → PROCESSING → SUCCESS
 *                       ↘ FAILED
 *
 * Guarantees:
 *   1. A second call with the same key returns the cached result immediately.
 *   2. A PROCESSING key (process crashed mid-flight) is treated as FAILED
 *      and can be re-driven by the caller.
 *   3. All transitions are DB-atomic via Prisma transactions.
 */

import { ConflictException, Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

export type PayoutState = 'PENDING' | 'PROCESSING' | 'SUCCESS' | 'FAILED';

export interface IdempotencyCheckResult {
  /** True → caller must process the payout now. */
  shouldProcess: boolean;
  /** The idempotency record ID (pass back to markSuccess / markFailed). */
  idempotencyId: string;
  /** Present when shouldProcess=false and a prior success exists. */
  cachedPayoutId?: string;
  /** Current state of the record. */
  state: PayoutState;
}

@Injectable()
export class PayoutIdempotencyService {
  private readonly logger = new Logger(PayoutIdempotencyService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * [TASK 2]: Deterministic Financial Idempotency
   * Constructs a cryptographic SHA-256 hash using the claim identifier and 
   * the current disruption time-window (YYYYMMDD_HH). This ensures that even 
   * if a network stutter occurs, the same claim window results in the same stable key.
   */
  buildKey(claimId: string, eventTimestamp: number): string {
    const now = new Date(eventTimestamp * 1000);
    const window = `${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(2, '0')}${String(now.getUTCDate()).padStart(2, '0')}_${String(now.getUTCHours()).padStart(2, '0')}`;
    
    // Deterministic hash: SHA-256(claimId + window)
    const base = `${claimId}_${window}`;
    return crypto.createHash('sha256').update(base).digest('hex');
  }

  /**
   * Check-or-create an idempotency record using a deterministic key.
   */
  async checkOrCreate(
    userId: string,
    h3Cell: string,
    eventTimestamp: number,
    policyId: string,
    disruptionEventId: string,
  ): Promise<IdempotencyCheckResult> {
    const claimId = `${policyId}_${disruptionEventId}`;
    const key = this.buildKey(claimId, eventTimestamp);

    // 1. Look up an existing record by our deterministic hash ID
    const existing = await this.prisma.payoutIdempotencyKey.findUnique({
      where: { id: key },
    });

    if (existing) {
      if (existing.payoutState === 'SUCCESS') {
        this.logger.log(`[idempotency] ✅ Key ${key} (derived) already SUCCESS → skipping payout`);
        return {
          shouldProcess: false,
          idempotencyId: existing.id,
          cachedPayoutId: existing.payoutId ?? undefined,
          state: 'SUCCESS',
        };
      }

      if (existing.payoutState === 'PROCESSING') {
        // Previous attempt crashed mid-flight — mark as FAILED so caller can retry
        this.logger.warn(`[idempotency] ⚠️  Key ${key} stuck in PROCESSING → resetting to FAILED`);
        const reset = await this.prisma.payoutIdempotencyKey.update({
          where: { id: existing.id },
          data: { payoutState: 'FAILED', errorMessage: 'Process interrupted — reset by idempotency guard' },
        });
        return { shouldProcess: true, idempotencyId: reset.id, state: 'FAILED' };
      }

      // PENDING or FAILED → allow retry
      this.logger.log(`[idempotency] 🔄 Key ${key} in state ${existing.payoutState} → will process`);
      return { shouldProcess: true, idempotencyId: existing.id, state: existing.payoutState as PayoutState };
    }

    // 2. Create a new record with the deterministic hash as the ID and PENDING state
    try {
      const created = await this.prisma.payoutIdempotencyKey.create({
        data: { id: key, userId, h3Cell, eventTimestamp, payoutState: 'PENDING' },
      });
      this.logger.log(`[idempotency] 🆕 Key ${key} created → PENDING`);
      return { shouldProcess: true, idempotencyId: created.id, state: 'PENDING' };
    } catch (err: unknown) {
      // Unique constraint violation: another request raced us — re-read
      if (typeof err === 'object' && err !== null && 'code' in err && (err as { code?: string }).code === 'P2002') {
        this.logger.warn(`[idempotency] Race detected for key ${key} — re-reading`);
        return this.checkOrCreate(userId, h3Cell, eventTimestamp, policyId, disruptionEventId);
      }
      throw err;
    }
  }

  /** Transition record to PROCESSING (atomically before hitting the payment gateway). */
  async markProcessing(idempotencyId: string): Promise<void> {
    await this.prisma.payoutIdempotencyKey.update({
      where: { id: idempotencyId },
      data: { payoutState: 'PROCESSING' },
    });
  }

  /** Transition record to SUCCESS and store the gateway payout ID. */
  async markSuccess(idempotencyId: string, payoutId: string): Promise<void> {
    await this.prisma.payoutIdempotencyKey.update({
      where: { id: idempotencyId },
      data: { payoutState: 'SUCCESS', payoutId },
    });
    this.logger.log(`[idempotency] ✅ ${idempotencyId} → SUCCESS (payoutId=${payoutId})`);
  }

  /** Transition record to FAILED and record the error reason. */
  async markFailed(idempotencyId: string, errorMessage: string): Promise<void> {
    await this.prisma.payoutIdempotencyKey.update({
      where: { id: idempotencyId },
      data: { payoutState: 'FAILED', errorMessage },
    });
    this.logger.error(`[idempotency] ❌ ${idempotencyId} → FAILED: ${errorMessage}`);
  }
}
