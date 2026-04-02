import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { RedisStateService } from '../state/redis-state.service';
import { InsuranceService } from './insurance.service';

@Injectable()
export class ClaimOrchestratorService {
  private readonly logger = new Logger(ClaimOrchestratorService.name);

  constructor(
    private readonly redisState: RedisStateService,
    private readonly insuranceService: InsuranceService,
  ) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async orchestrateAutoClaims() {
    this.logger.log('Starting zero-touch claim orchestration scan...');
    try {
      const haltedZones = await this.redisState.getAllHaltedZones();
      if (haltedZones.length === 0) {
        this.logger.debug('No halted zones found.');
        return;
      }

      for (const zone of haltedZones) {
        await this.orchestrateZoneClaims(zone.h3Cell);
      }
      this.logger.log('Zero-touch claim orchestration scan completed.');
    } catch (err: any) {
      this.logger.error(`Error during claim orchestration: ${err.message}`, err.stack);
    }
  }

  async orchestrateZoneClaims(h3Cell: string, eventTimestamp?: number) {
    this.logger.log(`Processing auto-claims for HALTED zone: ${h3Cell}`);
    const driversInZone = await this.redisState.getZoneDrivers(h3Cell);

    if (driversInZone.length === 0) {
      this.logger.debug(`No drivers found in zone ${h3Cell}`);
      return;
    }

    const timestamp = eventTimestamp ?? Math.floor(Date.now() / 1000);

    for (const driverId of driversInZone) {
      try {
        this.logger.log(`Evaluating auto-payout for driver ${driverId} in zone ${h3Cell}...`);
        const result = await this.insuranceService.processInsurance(driverId, {
          eventType: 'AUTO_EVAL',
          eventTimestamp: timestamp,
        });
        this.logger.log(`Result for ${driverId}: payout=${result.payout}, decision=${result.decision}`);
      } catch (err: any) {
        this.logger.error(`Auto-claim evaluation failed for driver ${driverId}: ${err.message}`, err.stack);
      }
    }
  }
}
