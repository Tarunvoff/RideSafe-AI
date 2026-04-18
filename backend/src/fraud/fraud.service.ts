import { getTimeBucket } from './time-utils';
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { createHash } from 'crypto';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { AnalyzeFraudDto, ReviewFraudDto } from './dto/fraud.dto';
import * as h3 from 'h3-js';
import pino from 'pino';
import type OpossumBreaker from 'opossum';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const CircuitBreaker = require('opossum');

// Structured Logger for Tier-1 Auditing
const structuredLogger = pino({
  name: 'Aegis-Enforcement-Engine',
  level: process.env.LOG_LEVEL || 'info',
  base: { service: 'fraud-service' },
});

// Circuit Breaker Options (Tier-1 Resiliency)
const breakerOptions = {
  timeout: 3000, // 3 seconds
  errorThresholdPercentage: 50,
  resetTimeout: 10000, // 10 seconds
};

// ── Python Fraud Feature Service (port 8002) ──────────────────────────────────
const FRAUD_FEATURE_URL = process.env.FRAUD_FEATURE_SERVICE_URL;
const FRAUD_AUTO_QUEUE_APPROVE_MAX = Number(process.env.FRAUD_AUTO_QUEUE_APPROVE_MAX ?? 55);
const FRAUD_AUTO_QUEUE_REJECT_MIN = Number(process.env.FRAUD_AUTO_QUEUE_REJECT_MIN ?? 75);
const FRAUD_AUTO_QUEUE_BATCH_SIZE = Number(process.env.FRAUD_AUTO_QUEUE_BATCH_SIZE ?? 50);

// ── Shape of the Python service response ─────────────────────────────────────
interface FraudFeatureResponse {
  identity: {
    account_age_days: number;
    device_id_uniqueness: number;
    device_switch_frequency: number;
    oauth_token_valid: boolean;
  };
  location: {
    gps_speed: number;
    gps_cell_distance: number;
    h3_zone_consistency: number;
  };
  behavior: {
    claims_last_30d: number;
    trigger_frequency: number;
    earnings_pattern_deviation: number;
  };
  meta: {
    h3_cell: string;
    timestamp: number;
    // ── Layer A: Device Intelligence ───────────────────────────────────────
    device_high_share?: boolean;    // >3 users on same device
    device_user_count?: number;
    // ── Layer B: H3 Burst Detection ────────────────────────────────────────
    h3_burst_detected?: boolean;    // multiple users in same H3 cell
    h3_active_count?: number;
    // ── Layer C: Temporal Behavior ─────────────────────────────────────────
    claims_last_24h?: number;
  };
}

interface FraudMlScoreResponse {
  fraud_score: number;
  rule_score: number;
  ml_anomaly_score: number;
  ml_classifier_score: number;
  top_signals: string[];
  model_used: 'hybrid' | 'rules_only';
}

interface DuplicateClaimSignal {
  isDuplicate: boolean;
  isCrossUserBurst: boolean;
  recentClaimCount: number;
  windowHours: number;
  matchedPayoutId?: string;
  matchedAmount?: number;
  matchedDisruptionType?: string | null;
  fingerprintHash?: string;
  fingerprintCount?: number;
  distinctUserCount?: number;
  signalScore: number;
}

@Injectable()
export class FraudService {
  private readonly logger = new Logger(FraudService.name);
  private readonly mlServiceUrl = process.env.ML_SERVICE_URL ?? 'http://localhost:8000';

  // ── Circuit Breakers (Fail-Closed Pattern) ──────────────────────────────────
  private readonly featureBreaker: OpossumBreaker<[string, AnalyzeFraudDto], FraudFeatureResponse> = 
    new CircuitBreaker(this.fetchFraudFeatures.bind(this), breakerOptions);

  private readonly mlBreaker: OpossumBreaker<[string, FraudFeatureResponse, AnalyzeFraudDto, string | undefined], FraudMlScoreResponse> = 
    new CircuitBreaker(this.fetchHybridFraudScore.bind(this), breakerOptions);

  constructor(
    private prisma: PrismaService,
    @InjectQueue('fraud-review') private readonly fraudQueue: Queue,
  ) {
    // Fail-Closed: When circuit is open/fails, throw error to trigger high-security state
    this.mlBreaker.fallback(() => {
      structuredLogger.error({ event: 'CIRCUIT_BREAKER_OPEN', service: 'ML_HYBRID_SCORING' }, 'ML service failing closed.');
      throw new Error('ML_SERVICE_DOWN_FAIL_CLOSED');
    });
  }


  // ── Step 0: Call Python fraud-feature-service ────────────────────────────
  private async fetchFraudFeatures(
    userId: string,
    dto: AnalyzeFraudDto,
  ): Promise<FraudFeatureResponse | null> {
    try {
      const payload = {
        user_id:      userId,
        device_id:    dto.deviceId      ?? `device_${userId}`,
        upi_id:       dto.upiId         ?? `upi_${userId}`,
        lat:          dto.gpsLatitude,
        lng:          dto.gpsLongitude,
        timestamp:    Math.floor(Date.now() / 1000),
        claim_amount: dto.claimAmount   ?? 0,
        event_type:   dto.eventType     ?? 'ANALYZE',
      };

      this.logger.log(`→ fraud-feature-service [user=${userId}]`);

      const resp = await fetch(`${FRAUD_FEATURE_URL}/fraud-features`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
        signal:  AbortSignal.timeout(5_000),  // 5 s hard timeout
      });

      if (!resp.ok) {
        this.logger.warn(`fraud-feature-service HTTP ${resp.status}`);
        return null;
      }

      return (await resp.json()) as FraudFeatureResponse;
    } catch (e) {
      this.logger.warn(
        `fraud-feature-service unreachable: ${e} — falling back to heuristics`,
      );
      return null;
    }
  }

  // ── Main analysis entry point ─────────────────────────────────────────────
  async analyzeFraud(userId: string, dto: AnalyzeFraudDto, token?: string) {
    const duplicateSignal = await this.detectDuplicateClaim(userId, dto);

    // 1. Fetch ML feature vector from Python service (Circuit Breaker protected)
    let features: FraudFeatureResponse;
    try {
      features = await this.featureBreaker.fire(userId, dto);
    } catch (err) {
      structuredLogger.warn({ 
        event: 'SERVICE_DEGRADATION', 
        target: 'feature-service', 
        userId, 
        error: err.message 
      }, 'Feature service unavailable; falling back to conservative rule-base.');
      features = null; 
    }

    if (!features) {
      const fallback = this.scoreFromFeatures(null, dto);
      return {
        ok: true,
        data: {
          analysis: {
            riskScore: fallback,
            status: fallback >= 75 ? 'AUTO_REJECTED' : 'INCONCLUSIVE',
            fraudReason: 'Feature service unavailable; system failing closed',
            features: null,
          },
        },
      };
    }

    let mlScore: FraudMlScoreResponse;
    try {
      mlScore = await this.mlBreaker.fire(userId, features, dto, token);
    } catch (err) {
      // ── FAIL CLOSED ──────────────────────────────────────────────────────
      structuredLogger.error({ 
        event: 'ENFORCEMENT_FAIL_CLOSED', 
        userId, 
        service: 'ml-insurance-service',
        error: err.message
      }, 'ML Intelligence Layer offline. Triggering high-security fail-closed rejection.');
      
      mlScore = {
        fraud_score: 95.0, 
        rule_score: 95.0,
        ml_anomaly_score: 0,
        ml_classifier_score: 0,
        top_signals: ['SYSTEM_FAIL_CLOSED'],
        model_used: 'rules_only',
      };
    }
    let riskScore = Number(mlScore.fraud_score);
    riskScore = this.applyDuplicateClaimPenalty(riskScore, duplicateSignal);
    const featureSource = `ml-insurance-service:${mlScore.model_used}`;
    const topSignals = mlScore.top_signals ?? [];
    if (duplicateSignal.isDuplicate) {
      topSignals.push('DUPLICATE_CLAIM_SIGNAL');
    }
    if (duplicateSignal.isCrossUserBurst) {
      topSignals.push('DUPLICATE_CLAIM_BURST');
    }
    const fraudReason = topSignals.length ? topSignals.join(', ') : 'MODEL_ANOMALY_SIGNAL';

    const status = riskScore >= 75
      ? 'AUTO_REJECTED'
      : riskScore >= 45
        ? 'INCONCLUSIVE'
        : 'APPROVED';

    // ── TIER-1 AUDIT LOGGING ───────────────────────────────────────────────
    if (status === 'AUTO_REJECTED') {
      structuredLogger.warn({
        event: 'FRAUD_ENFORCEMENT_BLOCK',
        userId,
        riskScore,
        signals: topSignals,
        inventory: features,
        traceId: createHash('md5').update(`${userId}-${Date.now()}`).digest('hex'),
      }, 'High-confidence fraud block enforced.');
    }
    // ────────────────────────────────────────────────────────────────────────

    // ── EVENT-DRIVEN REVIEW TRIGGER ──────────────────────────────────────────
    // If inconclusive, trigger a BullMQ job with a 300s (5m) delay.
    // This eliminates the "Burst Window" associated with cron-based resolution.
    if (status === 'INCONCLUSIVE') {
      await this.fraudQueue.add(
        'review-ttl',
        { userId },
        { 
          delay: 5 * 60 * 1000, 
          removeOnComplete: true,
          jobId: `review_ttl_${userId}` // idempotent by userId
        }
      );
      this.logger.log(`Event-Driven Review Queued: 5-minute TTL started for user ${userId}`);
    }
    // ──────────────────────────────────────────────────────────────────────────

    // 3. Persist / upsert to DB
    const existingUser = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!existingUser) {
      const analysisDetails = JSON.stringify(
        {
          ...this.buildDetails(dto, riskScore, features, featureSource, duplicateSignal),
          top_signals: topSignals,
          fraud_reason: fraudReason,
          rule_score: mlScore.rule_score,
          ml_anomaly_score: mlScore.ml_anomaly_score,
          ml_classifier_score: mlScore.ml_classifier_score,
          model_used: mlScore.model_used,
        },
      );

      this.logger.warn(
        `User ${userId} not found; skipping fraudAnalysis persistence for live telemetry`,
      );

      return {
        message: 'Fraud analysis completed (not persisted)',
        data: {
          id: null,
          riskScore,
          status,
          featureSource,
          topSignals,
          fraudReason,
          features: features ?? null,
          analysis: JSON.parse(analysisDetails),
        },
      };
    }

    const existing = await this.prisma.fraudAnalysis.findUnique({
      where: { userId },
    });

    const analysisDetails = JSON.stringify(
      {
        ...this.buildDetails(dto, riskScore, features, featureSource, duplicateSignal),
        top_signals: topSignals,
        fraud_reason: fraudReason,
        rule_score: mlScore.rule_score,
        ml_anomaly_score: mlScore.ml_anomaly_score,
        ml_classifier_score: mlScore.ml_classifier_score,
        model_used: mlScore.model_used,
      },
    );

    const dbData = {
      gpsLatitude:     dto.gpsLatitude,
      gpsLongitude:    dto.gpsLongitude,
      riskScore,
      status,
      deviceIntegrity: dto.deviceIntegrity ?? null,
      networkType:     dto.networkType     ?? null,
      velocityCheck:   dto.velocityCheck   ?? null,
      analysisDetails,
    };

    const result = existing
      ? await this.prisma.fraudAnalysis.update({
          where: { userId },
          data:  dbData,
        })
      : await this.prisma.fraudAnalysis.create({
          data: { userId, ...dbData },
        });

    return {
      message: 'Fraud analysis completed',
      data: {
        id:            result.id,
        riskScore:     result.riskScore,
        status:        result.status,
        featureSource,
        topSignals,
        fraudReason,
        features:      features ?? null,
        analysis:      JSON.parse(result.analysisDetails ?? '{}'),
      },
    };
  }

  private async fetchHybridFraudScore(
    userId: string,
    features: FraudFeatureResponse,
    dto: AnalyzeFraudDto,
    token?: string,
  ): Promise<FraudMlScoreResponse> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { phone: true },
    });

    const reqBody = {
      account_age_days: Number(features.identity.account_age_days ?? 0),
      device_id_uniqueness: Number(features.identity.device_id_uniqueness ?? 1),
      device_switch_frequency: Number(features.identity.device_switch_frequency ?? 0),
      gps_speed: Number(features.location.gps_speed ?? 0),
      h3_zone_consistency: Number(features.location.h3_zone_consistency ?? 1),
      claims_last_30d: Number(features.behavior.claims_last_30d ?? 0),
      claims_last_24h: Number(features.meta.claims_last_24h ?? 0),
      trigger_frequency: Number(features.behavior.trigger_frequency ?? 0),
      earnings_pattern_deviation: Number(features.behavior.earnings_pattern_deviation ?? 0),
      mismatch: Number(features.identity.device_id_uniqueness ?? 1) < 0.3,
      shared_driver_count_24h: Number(features.meta.device_user_count ?? 1),
      phone_number: user?.phone ?? null,
      altitude_accuracy: Number(dto.altitudeAccuracy ?? 0),
      is_mocked: Number(dto.isMocked ?? 0),
      mock_provider: dto.mockProvider ?? null,
      developer_mode: Number(dto.developerMode ?? 0),
      auth_token: token ?? null,
    };

    const response = await fetch(`${this.mlServiceUrl}/fraud/score`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(reqBody),
      signal: AbortSignal.timeout(5_000),
    });

    if (!response.ok) {
      throw new Error(`Fraud ML service HTTP ${response.status}`);
    }
    return (await response.json()) as FraudMlScoreResponse;
  }

  // ── Scoring: ML + rules + graph + H3 signals ──────────────────────────────
  private scoreFromFeatures(
    f: FraudFeatureResponse | null,
    dto: AnalyzeFraudDto,
  ): number {
    let score = 0;

    if (f) {
      // ── Layer 1: ML / Identity signals ────────────────────────────────────────
      if (f.identity.account_age_days < 7)          score += 20; // brand-new account
      if (f.identity.device_id_uniqueness < 0.3)    score += 15; // shared device
      if (f.identity.device_switch_frequency > 3)   score += 20; // 3+ switches/week

      // ── Layer 2: Location signals ─────────────────────────────────────────────
      if (f.location.gps_speed > 150)               score += 25; // impossible speed
      if (f.location.h3_zone_consistency < 0.3)     score += 10; // erratic zone
      if (f.location.gps_cell_distance > 50)        score += 15; // giant cell jump

      // ── Layer 3: Behaviour signals ────────────────────────────────────────────
      if (f.behavior.claims_last_30d > 10)           score += 20;
      if (f.behavior.trigger_frequency > 1.0)        score += 15; // > 1 claim/day
      if (f.behavior.earnings_pattern_deviation > 1) score += 10;

      // ── Layer 4-6: Meta Intelligence ────────────────────────────────────────
      if (f.meta.device_high_share)                  score += 20;
      if (f.meta.h3_burst_detected)                  score += 15;
      if ((f.meta.claims_last_24h ?? 0) >= 2)        score += 20;
    }

    // ── Layer 7: Legacy device / network heuristics (defence-in-depth) ────────
    if (dto.deviceIntegrity === 'Rooted Device')     score += 20;
    if (dto.deviceIntegrity === 'Jailbroken Device') score += 25;
    if (dto.networkType === 'Premium VPN')           score += 15;
    if (dto.networkType === 'Proxy')                 score += 25;
    if (dto.velocityCheck === 'Suspicious')          score += 20;

    // ── Layer 8: GPS Spoof Intelligence ───────────────────────────────────────
    if (dto.isMocked)                                score += 60; // critical spoof signal
    if (dto.developerMode)                           score += 30; // dev mode active
    if (dto.altitudeAccuracy != null && dto.altitudeAccuracy > 10) score += 10; 

    return Math.min(score, 100);
  }

  // ── Scoring: heuristic fallback (Python service down) ─────────────────────
  private scoreFallback(dto: AnalyzeFraudDto): number {
    let score = 0;
    if (dto.gpsLatitude === 0 && dto.gpsLongitude === 0)                      score += 30;
    if (Math.abs(dto.gpsLatitude) > 90 || Math.abs(dto.gpsLongitude) > 180)  score += 40;
    if (dto.deviceIntegrity === 'Rooted Device')     score += 20;
    if (dto.deviceIntegrity === 'Jailbroken Device') score += 25;
    if (dto.networkType === 'Premium VPN')           score += 15;
    if (dto.networkType === 'Proxy')                 score += 25;
    if (dto.velocityCheck === 'Suspicious')          score += 20;
    return Math.min(score, 100);
  }

  // ── Build analysis details stored in DB ──────────────────────────────────
  private buildDetails(
    dto: AnalyzeFraudDto,
    riskScore: number,
    features: FraudFeatureResponse | null,
    featureSource: string,
    duplicateSignal?: DuplicateClaimSignal,
  ) {
    const riskFactors: string[] = [];

    if (features) {
      // Layer 1–3: ML signals
      if (features.identity.account_age_days < 7)
        riskFactors.push('New account (< 7 days)');
      if (features.identity.device_switch_frequency > 3)
        riskFactors.push('Excessive device switches this week');
      if (features.identity.device_id_uniqueness < 0.3)
        riskFactors.push('Highly shared device — possible SIM swap');
      if (features.location.gps_speed > 150)
        riskFactors.push('Physically impossible GPS speed');
      if (features.location.h3_zone_consistency < 0.3)
        riskFactors.push('Erratic GPS zone consistency');
      if (features.behavior.claims_last_30d > 10)
        riskFactors.push('High claim frequency (> 10 in 30 days)');
      if (features.behavior.trigger_frequency > 1.0)
        riskFactors.push('Multiple claims per active day');

      // Layer A: Device Intelligence
      if (features.meta.device_high_share)
        riskFactors.push(`Device shared by ${features.meta.device_user_count ?? '?'} users — Device Intelligence alert`);

      // Layer B: H3 Burst Detection
      if (features.meta.h3_burst_detected)
        riskFactors.push(`H3 cluster fraud — ${features.meta.h3_active_count ?? '?'} users simultaneously in cell ${features.meta.h3_cell}`);

      // Layer C: Temporal Behavior
      if ((features.meta.claims_last_24h ?? 0) >= 2)
        riskFactors.push(`Temporal burst: ${features.meta.claims_last_24h} claims filed in last 24 hours`);
    } else {
      if (riskScore > 60)
        riskFactors.push('GPS signals exhibit inconsistent timing offsets');
      if (dto.deviceIntegrity === 'Rooted Device')
        riskFactors.push('Device integrity compromised');
      if (dto.networkType === 'Premium VPN')
        riskFactors.push('Premium VPN detected');
    }

    if (duplicateSignal?.isDuplicate) {
      const amountPart = duplicateSignal.matchedAmount
        ? `; amount ~= ${duplicateSignal.matchedAmount}`
        : '';
      const typePart = duplicateSignal.matchedDisruptionType
        ? `; type=${duplicateSignal.matchedDisruptionType}`
        : '';
      riskFactors.push(
        `Duplicate-claim pattern: ${duplicateSignal.recentClaimCount} payouts in last ${duplicateSignal.windowHours}h${amountPart}${typePart}`,
      );
    }

    if (duplicateSignal?.isCrossUserBurst) {
      riskFactors.push(
        `Cross-user duplicate burst: ${duplicateSignal.distinctUserCount ?? '?'} users filed matching claims in same time bucket`,
      );
    }

    return {
      featureSource,
      gpsCoordinates: `${dto.gpsLatitude}, ${dto.gpsLongitude}`,
      mlFeatures:     features ?? 'unavailable',
      riskFactors,
      duplicateClaimSignal: duplicateSignal ?? { isDuplicate: false },
    };
  }

  private applyDuplicateClaimPenalty(riskScore: number, signal: DuplicateClaimSignal) {
    if (!signal.isDuplicate || signal.signalScore <= 0) {
      return Math.min(riskScore, 100);
    }
    return Math.min(100, riskScore + signal.signalScore);
  }

  private async detectDuplicateClaim(
    userId: string,
    dto: AnalyzeFraudDto,
  ): Promise<DuplicateClaimSignal> {
    const windowHours = Number(process.env.DUPLICATE_CLAIM_WINDOW_HOURS ?? 24);
    const amountVariance = Number(process.env.DUPLICATE_CLAIM_AMOUNT_VARIANCE ?? 0.15);
    const amountBucketSize = Number(process.env.DUPLICATE_CLAIM_AMOUNT_BUCKET ?? 50);
    const timeBucketMinutes = Number(process.env.DUPLICATE_CLAIM_TIME_BUCKET_MINUTES ?? 30);
    const crossUserThreshold = Number(process.env.DUPLICATE_CLAIM_CROSS_USER_THRESHOLD ?? 3);
    const windowStart = new Date(Date.now() - windowHours * 60 * 60 * 1000);

    const isClaimEvent = Boolean(dto.eventType?.toUpperCase().includes('CLAIM')) || Boolean(dto.claimAmount);
    if (!isClaimEvent) {
      return {
        isDuplicate: false,
        isCrossUserBurst: false,
        recentClaimCount: 0,
        windowHours,
        signalScore: 0,
      };
    }

    const eventType = dto.eventType ?? 'CLAIM_EVENT';
    const h3Cell = h3.latLngToCell(dto.gpsLatitude, dto.gpsLongitude, 8);
    const claimAmount = dto.claimAmount ?? 0;
    const amountBucket = amountBucketSize > 0
      ? Math.round(claimAmount / amountBucketSize) * amountBucketSize
      : Math.round(claimAmount);
    const timeBucket = getTimeBucket();
    const fingerprintSource = `${eventType}|${h3Cell}|${amountBucket}|${timeBucket}`;
    const fingerprintHash = createHash('sha256').update(fingerprintSource).digest('hex');

    const fingerprintMatches = await this.prisma.claimFingerprint.findMany({
      where: {
        fingerprintHash,
        createdAt: { gte: windowStart },
      },
      select: { userId: true },
    });

    const distinctUsers = new Set(fingerprintMatches.map((match) => match.userId));
    const sameUserCount = fingerprintMatches.filter((match) => match.userId === userId).length;
    const isCrossUserBurst = distinctUsers.size >= crossUserThreshold;

    const recentPayouts = await this.prisma.payout.findMany({
      where: {
        policy: { userId },
        createdAt: { gte: windowStart },
      },
      include: { disruptionEvent: true },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    const isDuplicate = isCrossUserBurst || sameUserCount > 0 || recentPayouts.length > 0;
    const matchedAmount = claimAmount
      ? recentPayouts.find((p) => {
          const approved = Number(p.approvedPayout ?? p.estimatedLoss ?? 0);
          if (!approved || approved <= 0) return false;
          const delta = Math.abs(approved - claimAmount);
          return delta / Math.max(1, claimAmount) <= amountVariance;
        })
      : null;

    const matchedDisruption = dto.eventType
      ? recentPayouts.find((p) => p.disruptionEvent?.type === dto.eventType)
      : null;

    let signalScore = 0;
    if (recentPayouts.length >= 2) signalScore += 25;
    else if (recentPayouts.length === 1) signalScore += 15;
    if (sameUserCount > 0) signalScore += 20;
    if (isCrossUserBurst) signalScore += 20;
    if (matchedAmount) signalScore += 20;
    if (matchedDisruption) signalScore += 10;

    try {
      await this.prisma.claimFingerprint.create({
        data: {
          userId,
          h3Cell,
          eventType,
          claimAmount,
          amountBucket,
          timeBucket,
          fingerprintHash,
        },
      });
    } catch (err: unknown) {
      if (typeof err === 'object' && err !== null && 'code' in err && (err as { code?: string }).code === 'P2002') {
        // Ignore duplicate fingerprint insert for same user/time bucket.
      } else {
        this.logger.warn(`Claim fingerprint insert failed for ${userId}: ${String(err)}`);
      }
    }

    return {
      isDuplicate,
      isCrossUserBurst,
      recentClaimCount: recentPayouts.length,
      windowHours,
      matchedPayoutId: matchedAmount?.id ?? recentPayouts[0]?.id,
      matchedAmount: matchedAmount
        ? Number(matchedAmount.approvedPayout ?? matchedAmount.estimatedLoss ?? 0)
        : undefined,
      matchedDisruptionType: matchedDisruption?.disruptionEvent?.type ?? null,
      fingerprintHash,
      fingerprintCount: fingerprintMatches.length,
      distinctUserCount: distinctUsers.size,
      signalScore: Math.min(60, signalScore),
    };
  }

  // ── Read-only / admin endpoints ───────────────────────────────────────────

  async getStatus(userId: string) {
    const analysis = await this.prisma.fraudAnalysis.findUnique({
      where: { userId },
    });
    if (!analysis) {
      return { status: 'PENDING', riskScore: 0, message: 'No analysis found' };
    }
    return {
      status:          analysis.status,
      riskScore:       analysis.riskScore,
      deviceIntegrity: analysis.deviceIntegrity,
      networkType:     analysis.networkType,
      velocityCheck:   analysis.velocityCheck,
      analysis:        JSON.parse(analysis.analysisDetails ?? '{}'),
    };
  }


  async getSubmissions() {
    const submissions = await this.prisma.fraudAnalysis.findMany({
      include: { user: { select: { id: true, email: true, phone: true, createdAt: true, driverName: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return {
      total: submissions.length,
      submissions: submissions.map((sub: any) => ({
        analysisId: sub.id,
        userId:     sub.userId,
        user:       sub.user.driverName || sub.user.email,
        email:      sub.user.email,
        phone:      sub.user.phone,
        riskScore:  sub.riskScore,
        status:     sub.status,
        createdAt:  sub.createdAt,
      })),
    };
  }

  async getSubmissionDetails(userId: string) {
    const analysis = await this.prisma.fraudAnalysis.findUnique({
      where:   { userId },
      include: { user: { select: { id: true, email: true, phone: true } } },
    });
    if (!analysis) throw new NotFoundException('Fraud analysis not found');
    return {
      analysis: {
        id:              analysis.id,
        riskScore:       analysis.riskScore,
        status:          analysis.status,
        gpsLatitude:     analysis.gpsLatitude,
        gpsLongitude:    analysis.gpsLongitude,
        deviceIntegrity: analysis.deviceIntegrity,
        networkType:     analysis.networkType,
        velocityCheck:   analysis.velocityCheck,
        details:         JSON.parse(analysis.analysisDetails ?? '{}'),
        createdAt:       analysis.createdAt,
      },
      user: analysis.user,
    };
  }

  async reviewSubmission(userId: string, dto: ReviewFraudDto) {
    const analysis = await this.prisma.fraudAnalysis.update({
      where: { userId },
      data: {
        status:     dto.status,
        reviewedAt: new Date(),
        reviewNote: dto.reviewNote ?? null,
      },
    });
    return {
      message: `Fraud analysis ${dto.status.toLowerCase()} successfully`,
      data: {
        userId:     analysis.userId,
        status:     analysis.status,
        reviewedAt: analysis.reviewedAt,
        reviewNote: analysis.reviewNote,
      },
    };
  }

  async escalateSubmission(userId: string, reviewNote?: string) {
    const analysis = await this.prisma.fraudAnalysis.update({
      where: { userId },
      data: {
        status:     'ESCALATED',
        reviewedAt: new Date(),
        reviewNote: reviewNote ?? 'Escalated to fraud analyst',
      },
    });
    return {
      message: 'Fraud analysis escalated successfully',
      data: {
        userId:     analysis.userId,
        status:     analysis.status,
        reviewedAt: analysis.reviewedAt,
        reviewNote: analysis.reviewNote,
      },
    };
  }

  async exportSubmissionPdf(userId: string) {
    const details = await this.getSubmissionDetails(userId);
    const analysis = details.analysis;
    const user = details.user;
    const riskFactors = Array.isArray(analysis?.details?.riskFactors)
      ? analysis.details.riskFactors
      : [];

    const lines = [
      'Aegis Fraud Report',
      `Analysis ID: ${analysis.id}`,
      `Status: ${analysis.status}`,
      `Risk Score: ${analysis.riskScore}`,
      `User Email: ${user.email ?? 'Unknown'}`,
      `User Phone: ${user.phone ?? 'Unknown'}`,
      `GPS: ${analysis.gpsLatitude ?? 'N/A'}, ${analysis.gpsLongitude ?? 'N/A'}`,
      `Created At: ${analysis.createdAt}`,
      '',
      'Risk Factors:',
      ...(riskFactors.length ? riskFactors.map((factor: string, idx: number) => `${idx + 1}. ${factor}`) : ['None']),
    ];

    const pdfBuffer = this.buildSimplePdf(lines);
    return {
      fileName: `fraud-report-${analysis.id}.pdf`,
      contentType: 'application/pdf',
      base64: pdfBuffer.toString('base64'),
    };
  }

  private buildSimplePdf(lines: string[]): Buffer {
    const escape = (value: string) =>
      value.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');

    const fontRef = '5 0 R';
    const contentLines = lines.map((line, index) => {
      const y = 760 - index * 16;
      return `1 0 0 1 50 ${y} Tm (${escape(line)}) Tj`;
    });

    const contentStream = `BT /F1 12 Tf\n${contentLines.join('\n')}\nET`;
    const objects = [
      '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj',
      '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj',
      `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 ${fontRef} >> >> >>\nendobj`,
      `4 0 obj\n<< /Length ${Buffer.byteLength(contentStream, 'utf8')} >>\nstream\n${contentStream}\nendstream\nendobj`,
      '5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj',
    ];

    const header = '%PDF-1.3\n';
    const parts: string[] = [header];
    const offsets: number[] = [0];
    let total = Buffer.byteLength(header, 'utf8');

    objects.forEach((obj) => {
      offsets.push(total);
      const chunk = `${obj}\n`;
      parts.push(chunk);
      total += Buffer.byteLength(chunk, 'utf8');
    });

    const xrefStart = total;
    const xrefLines = [
      `xref\n0 ${objects.length + 1}`,
      '0000000000 65535 f ',
      ...offsets.slice(1).map((offset) => `${String(offset).padStart(10, '0')} 00000 n `),
    ];
    const xref = `${xrefLines.join('\n')}\n`;
    parts.push(xref);
    total += Buffer.byteLength(xref, 'utf8');

    const trailer = `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`;
    parts.push(trailer);

    return Buffer.from(parts.join(''), 'utf8');
  }
}
