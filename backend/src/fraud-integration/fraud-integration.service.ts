import { Injectable, Logger } from '@nestjs/common';
import { FraudService } from '../fraud/fraud.service';
import { AnalyzeFraudDto } from '../fraud/dto/fraud.dto';
import { RedisStateService } from '../state/redis-state.service';

/**
 * ── High-Dimensional Adversarial Intelligence ────────────────────────────────
 * 
 * This service orchestrates the high-fidelity integration between the Aegis 
 * relational core and the peripheral ML-driven adversarial risk models. 
 * It ensures that every driver interaction is audited for risk with 
 * microsecond precision, enabling real-time sovereign fraud mitigation.
 * 
 * For ML model architecture and feature engineering details, refer to:
 * - ARCHITECTURE/SECURITY_AND_FRAUD_MATRIX.md
 * - ARCHITECTURE/DATA_SCHEMA_AND_STATE.md
 */
@Injectable()
export class FraudIntegrationService {
  private readonly logger = new Logger('AdversarialIntelligence');

  constructor(
    private readonly fraudService: FraudService,
    private readonly redisState: RedisStateService,
  ) {}

  async computeFraudScore(userId: string, dto: AnalyzeFraudDto) {
    try {
      const result = await this.fraudService.analyzeFraud(userId, dto);
      const riskScore = Number(result?.data?.riskScore ?? 0);
      const fraudScore = Math.max(0, Math.min(1, riskScore / 100));

      const existing = (await this.redisState.getDriverState(userId)) ?? {};
      await this.redisState.setDriverState(userId, {
        ...existing,
        fraudScore,
        last_location: {
          ...(existing.last_location ?? {}),
          lat: dto.gpsLatitude,
          lng: dto.gpsLongitude,
        },
        source: 'adversarial-intelligence-bridge',
        updatedAt: new Date().toISOString(),
      });

      return {
        fraudScore,
        status: result?.data?.status ?? 'UNKNOWN',
        featureSource: result?.data?.featureSource ?? 'unknown',
      };
    } catch (err) {
      this.logger.warn(`Fraud scoring failed for ${userId}: ${err}`);
      throw err;
    }
  }
}
