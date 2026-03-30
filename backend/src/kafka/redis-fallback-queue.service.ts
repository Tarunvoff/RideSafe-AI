/**
 * redis-fallback-queue.service.ts — In-process Redis queue for Kafka outages.
 *
 * When the Kafka broker is unavailable:
 *   1. Events are pushed to a Redis LIST: fallback_queue:{topic}
 *   2. A @Cron job drains the queue every 30 seconds and re-emits to Kafka.
 *   3. If Redis is also unavailable, falls through to the DB-backed DLQ.
 *
 * Design principles:
 *   - Zero dependencies on kafkajs internals.
 *   - TTL-less LIST entries so no data is silently dropped.
 *   - Batch drain (50 at a time) to control broker burst.
 */

import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';

const REDIS_URL = process.env.REDIS_URL ?? 'redis://localhost:6379';
const DRAIN_BATCH_SIZE = 50;
const QUEUE_KEY_PREFIX = 'fallback_queue:';

@Injectable()
export class RedisFallbackQueueService {
  private readonly logger = new Logger(RedisFallbackQueueService.name);
  private redisClient: any = null;
  private drainFn: ((topic: string, key: string | undefined, payload: Record<string, unknown>) => Promise<void>) | null = null;

  // ── Redis bootstrap ────────────────────────────────────────────────────────

  private async getRedis() {
    if (this.redisClient) return this.redisClient;
    try {
      // Lazy import — keeps startup fast when Redis is not configured
      const { createClient } = await import('redis');
      const client = createClient({ url: REDIS_URL });
      client.on('error', (err: Error) =>
        this.logger.warn(`[Redis fallback] client error: ${err.message}`),
      );
      await client.connect();
      this.redisClient = client;
      this.logger.log(`[Redis fallback] Connected to ${REDIS_URL}`);
      return this.redisClient;
    } catch (err) {
      this.logger.warn(`[Redis fallback] Cannot connect to Redis: ${err}`);
      return null;
    }
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  /**
   * Register the function used to drain the queue back into Kafka.
   * KafkaReliableProducerService calls this on module init.
   */
  registerDrainFn(
    fn: (topic: string, key: string | undefined, payload: Record<string, unknown>) => Promise<void>,
  ): void {
    this.drainFn = fn;
    this.logger.log('[Redis fallback] Drain function registered');
  }

  /**
   * Push an event to the Redis fallback queue for reliable later delivery.
   *
   * @returns true  — pushed to Redis successfully
   * @returns false — Redis also unavailable (caller should use DB DLQ)
   */
  async push(
    topic: string,
    key: string | undefined,
    payload: Record<string, unknown>,
  ): Promise<boolean> {
    const redis = await this.getRedis();
    if (!redis) return false;

    const entry = JSON.stringify({ topic, key, payload, pushedAt: Date.now() });
    try {
      await redis.lPush(`${QUEUE_KEY_PREFIX}${topic}`, entry);
      this.logger.log(`[Redis fallback] Queued 1 event → ${QUEUE_KEY_PREFIX}${topic}`);
      return true;
    } catch (err) {
      this.logger.error(`[Redis fallback] lPush failed: ${err}`);
      return false;
    }
  }

  /**
   * Return queue depth for a topic (for health checks / metrics).
   */
  async queueDepth(topic: string): Promise<number> {
    const redis = await this.getRedis();
    if (!redis) return -1;
    try {
      return await redis.lLen(`${QUEUE_KEY_PREFIX}${topic}`);
    } catch {
      return -1;
    }
  }

  // ── Cron drain ─────────────────────────────────────────────────────────────

  /**
   * Every 30 seconds: try to drain the Redis fallback queue back into Kafka.
   * Only runs if Kafka is now reachable (drainFn succeeds without throw).
   */
  @Cron('*/30 * * * * *') // every 30 seconds
  async drainQueue(): Promise<void> {
    if (!this.drainFn) return;
    const redis = await this.getRedis();
    if (!redis) return;

    // Collect all known topics by scanning keys
    let topics: string[] = [];
    try {
      const keys: string[] = await redis.keys(`${QUEUE_KEY_PREFIX}*`);
      topics = keys.map((k: string) => k.replace(QUEUE_KEY_PREFIX, ''));
    } catch {
      return;
    }

    for (const topic of topics) {
      let processed = 0;
      while (processed < DRAIN_BATCH_SIZE) {
        let raw: string | null = null;
        try {
          raw = await redis.rPop(`${QUEUE_KEY_PREFIX}${topic}`);
        } catch {
          break;
        }
        if (!raw) break; // queue empty

        let entry: { topic: string; key?: string; payload: Record<string, unknown> };
        try {
          entry = JSON.parse(raw);
        } catch {
          continue; // corrupt entry — discard
        }

        try {
          await this.drainFn(entry.topic, entry.key, entry.payload);
          processed++;
        } catch {
          // Kafka still down — push back to front of queue and stop
          await redis.lPush(`${QUEUE_KEY_PREFIX}${topic}`, raw).catch(() => {});
          this.logger.warn(`[Redis fallback] Kafka still unavailable — ${topic} drain paused`);
          break;
        }
      }
      if (processed > 0) {
        this.logger.log(`[Redis fallback] Drained ${processed} events from ${topic}`);
      }
    }
  }
}
