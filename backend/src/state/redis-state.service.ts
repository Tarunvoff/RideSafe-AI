import { Injectable, Logger } from '@nestjs/common';

const REDIS_URL = process.env.REDIS_URL ?? 'redis://localhost:6379';
const DRIVER_STATE_TTL = Number(process.env.DRIVER_STATE_TTL_SECONDS ?? 900);
const POLICY_STATE_TTL = Number(process.env.POLICY_STATE_TTL_SECONDS ?? 900);
const ZONE_DRIVER_TTL = Number(process.env.ZONE_DRIVER_TTL_SECONDS ?? 900);

@Injectable()
export class RedisStateService {
  private readonly logger = new Logger(RedisStateService.name);
  private redisClient: any = null;

  private async getRedis() {
    if (this.redisClient) return this.redisClient;
    try {
      const { createClient } = await import('redis');
      const client = createClient({ url: REDIS_URL });
      client.on('error', (err: Error) =>
        this.logger.warn(`[Redis state] client error: ${err.message}`),
      );
      await client.connect();
      this.redisClient = client;
      this.logger.log(`[Redis state] Connected to ${REDIS_URL}`);
      return this.redisClient;
    } catch (err) {
      this.logger.warn(`[Redis state] Cannot connect to Redis: ${err}`);
      return null;
    }
  }

  async getZoneState(h3Cell: string): Promise<Record<string, any> | null> {
    const redis = await this.getRedis();
    if (!redis) return null;
    try {
      const raw = await redis.get(`zone:${h3Cell}`);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (err) {
      this.logger.warn(`[Redis state] zone:${h3Cell} read failed: ${err}`);
      return null;
    }
  }

  async setDriverState(driverId: string, payload: Record<string, any>) {
    const redis = await this.getRedis();
    if (!redis) return;
    try {
      await redis.setEx(`driver:${driverId}`, DRIVER_STATE_TTL, JSON.stringify(payload));
    } catch (err) {
      this.logger.warn(`[Redis state] driver:${driverId} write failed: ${err}`);
    }
  }

  async getDriverState(driverId: string): Promise<Record<string, any> | null> {
    const redis = await this.getRedis();
    if (!redis) return null;
    try {
      const raw = await redis.get(`driver:${driverId}`);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (err) {
      this.logger.warn(`[Redis state] driver:${driverId} read failed: ${err}`);
      return null;
    }
  }

  async setPolicyState(policyId: string, payload: Record<string, any>) {
    const redis = await this.getRedis();
    if (!redis) return;
    try {
      await redis.setEx(`policy:${policyId}`, POLICY_STATE_TTL, JSON.stringify(payload));
    } catch (err) {
      this.logger.warn(`[Redis state] policy:${policyId} write failed: ${err}`);
    }
  }

  async getPolicyState(policyId: string) {
    const redis = await this.getRedis();
    if (!redis) return null;
    try {
      const raw = await redis.get(`policy:${policyId}`);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (err) {
      this.logger.warn(`[Redis state] policy:${policyId} read failed: ${err}`);
      return null;
    }
  }

  async addDriverToZone(h3Cell: string, driverId: string) {
    const redis = await this.getRedis();
    if (!redis) return;
    const setKey = `zone:${h3Cell}:drivers`;
    try {
      await redis.sAdd(setKey, driverId);
      await redis.expire(setKey, ZONE_DRIVER_TTL);
    } catch (err) {
      this.logger.warn(`[Redis state] zone set update failed for ${h3Cell}: ${err}`);
    }
  }

  async getZoneDrivers(h3Cell: string): Promise<string[]> {
    const redis = await this.getRedis();
    if (!redis) return [];
    const setKey = `zone:${h3Cell}:drivers`;
    try {
      return await redis.sMembers(setKey);
    } catch (err) {
      this.logger.warn(`[Redis state] zone drivers read failed for ${h3Cell}: ${err}`);
      return [];
    }
  }

  async pushPayoutRetry(payload: Record<string, any>) {
    const redis = await this.getRedis();
    if (!redis) return;
    try {
      await redis.lPush('payout_retry_queue', JSON.stringify(payload));
    } catch (err) {
      this.logger.warn(`[Redis state] payout retry enqueue failed: ${err}`);
    }
  }
}
