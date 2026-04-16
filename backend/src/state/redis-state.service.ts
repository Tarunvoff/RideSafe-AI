import { Injectable, Logger } from '@nestjs/common';
export const PARAMETRIC_TRIGGER_STATES = ['HALTED', 'FLOODED', 'TOXIC_AQI', 'GRIDLOCK'];

const REDIS_URL = process.env.REDIS_URL;
const DRIVER_STATE_TTL = Number(process.env.DRIVER_STATE_TTL_SECONDS ?? 900);
const POLICY_STATE_TTL = Number(process.env.POLICY_STATE_TTL_SECONDS ?? 900);
const ZONE_DRIVER_TTL = Number(process.env.ZONE_DRIVER_TTL_SECONDS ?? 900);
const ZONE_STATE_TTL = Number(process.env.ZONE_STATE_TTL_SECONDS ?? 900);

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

  async setZoneState(h3Cell: string, payload: Record<string, any>) {
    const redis = await this.getRedis();
    if (!redis) return;
    try {
      await redis.setEx(`zone:${h3Cell}`, ZONE_STATE_TTL, JSON.stringify(payload));
    } catch (err) {
      this.logger.warn(`[Redis state] zone:${h3Cell} write failed: ${err}`);
    }
  }

  async getAllHaltedZones(): Promise<{ h3Cell: string; state: any }[]> {
    const redis = await this.getRedis();
    if (!redis) return [];
    try {
      // Find all zone keys
      const keys = await redis.keys('zone:*');
      // A zone key should be exactly "zone:cell". If there are more parts (e.g. zone:cell:drivers), ignore.
      const zoneKeys = keys.filter(k => k.split(':').length === 2);
      
      const haltedZones: { h3Cell: string; state: any }[] = [];
      for (const key of zoneKeys) {
        const raw = await redis.get(key);
        if (raw) {
          const state = JSON.parse(raw);
          const zs = state.zone_state?.toUpperCase() ?? state.state?.toUpperCase();
          if (PARAMETRIC_TRIGGER_STATES.includes(zs)) {
            const h3Cell = key.replace('zone:', '');
            haltedZones.push({ h3Cell, state });
          }
        }
      }
      return haltedZones;
    } catch (err) {
      this.logger.warn(`[Redis state] failed to get halted zones: ${err}`);
      return [];
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
    const driverZoneKey = `driver:${driverId}:zone`;
    try {
      const previousZone = await redis.get(driverZoneKey);
      if (previousZone && previousZone !== h3Cell) {
        await redis.sRem(`zone:${previousZone}:drivers`, driverId);
      }
      await redis.sAdd(setKey, driverId);
      await redis.expire(setKey, ZONE_DRIVER_TTL);
      await redis.setEx(driverZoneKey, ZONE_DRIVER_TTL, h3Cell);
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
