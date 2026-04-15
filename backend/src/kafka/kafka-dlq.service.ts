/**
 * kafka-dlq.service.ts — Dead Letter Queue handler for Kafka failures.
 *
 * Flow:
 *   1. KafkaProducerService calls pushToDlq() on any emit failure.
 *   2. Record is persisted in postgres kafka_dlq table (status=PENDING).
 *   3. A @Cron job attempts replay every 60 seconds (max 5 retries → DEAD).
 *
 * Why DB, not a separate DLQ topic?
 *   - Works even when the broker itself is down (topic unreachable).
 *   - Persists across restarts without extra consumer group config.
 *   - Easy to inspect / replay via admin panel.
 */

import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';

export interface DlqPayload {
  topic: string;
  eventKey?: string;
  payload: Record<string, unknown>;
  error?: string;
}

const MAX_RETRIES = 5;

@Injectable()
export class KafkaDlqService {
  private readonly logger = new Logger(KafkaDlqService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Persist a failed Kafka message into the DLQ table.
   * Called by KafkaReliableProducerService on emit failure.
   */
  async pushToDlq(entry: DlqPayload): Promise<void> {
    const prisma = this.prisma;
    try {
      await prisma.kafkaDLQ.create({
        data: {
          topic: entry.topic,
          eventKey: entry.eventKey ?? null,
          payload: JSON.stringify(entry.payload),
          error: entry.error ?? 'unknown',
          status: 'PENDING',
          retryCount: 0,
        },
      });
      this.logger.warn(
        `[DLQ] Pushed to DLQ → topic=${entry.topic} key=${entry.eventKey ?? 'none'} error="${entry.error}"`,
      );
    } catch (dbErr) {
      this.logger.error(`[DLQ] Failed to persist DLQ entry: ${dbErr}`);
    }
  }

  /**
   * Retrieve all pending DLQ entries (for admin review / replay).
   */
  async getPendingEntries(limit = 100) {
    const prisma = this.prisma;
    return prisma.kafkaDLQ.findMany({
      where: { status: { in: ['PENDING', 'RETRYING'] } },
      orderBy: { createdAt: 'asc' },
      take: limit,
    });
  }

  /**
   * Mark a specific entry as DEAD (manual admin action).
   */
  async markDead(id: string): Promise<void> {
    const prisma = this.prisma;
    await prisma.kafkaDLQ.update({
      where: { id },
      data: { status: 'DEAD' },
    });
    this.logger.warn(`[DLQ] Entry ${id} manually marked as DEAD`);
  }

  /**
   * Cron-driven replay: runs every 60 seconds.
   * Attempts to re-emit pending DLQ entries via the provided emit callback.
   * Caller (KafkaReliableProducerService) registers the replay function on boot.
   */
  private replayFn: ((topic: string, key: string | undefined, payload: Record<string, unknown>) => Promise<void>) | null = null;

  registerReplayFn(
    fn: (topic: string, key: string | undefined, payload: Record<string, unknown>) => Promise<void>,
  ): void {
    this.replayFn = fn;
    this.logger.log('[DLQ] Replay function registered');
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async replayPending(): Promise<void> {
    if (!this.replayFn) return;

    const prisma = this.prisma;
    const entries = await this.getPendingEntries(20);

    if (entries.length === 0) return;
    this.logger.log(`[DLQ] Replaying ${entries.length} pending DLQ entries`);

    for (const entry of entries) {
      try {
        await prisma.kafkaDLQ.update({
          where: { id: entry.id },
          data: { status: 'RETRYING', retryCount: entry.retryCount + 1 },
        });

        const payload = JSON.parse(entry.payload);
        await this.replayFn(entry.topic, entry.eventKey ?? undefined, payload);

        await prisma.kafkaDLQ.update({
          where: { id: entry.id },
          data: { status: 'DEAD', error: 'Replayed successfully' }, // "DEAD" = processed, not a real failure
        });
        this.logger.log(`[DLQ] ✅ Replayed entry ${entry.id}`);
      } catch (err) {
        const newCount = entry.retryCount + 1;
        const nextStatus = newCount >= MAX_RETRIES ? 'DEAD' : 'PENDING';
        await prisma.kafkaDLQ.update({
          where: { id: entry.id },
          data: {
            status: nextStatus,
            retryCount: newCount,
            error: String(err),
          },
        }).catch(() => {}); // swallow update errors
        this.logger.warn(`[DLQ] ❌ Replay failed for ${entry.id} (attempt ${newCount}/${MAX_RETRIES})`);
      }
    }
  }
}
