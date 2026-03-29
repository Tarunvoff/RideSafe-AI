import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AnalyzeFraudDto, ReviewFraudDto } from './dto/fraud.dto';

// ── Python Fraud Feature Service (port 8002) ──────────────────────────────────
// Override via FRAUD_FEATURE_SERVICE_URL env var in production.
const FRAUD_FEATURE_URL =
  process.env.FRAUD_FEATURE_SERVICE_URL ?? 'http://localhost:8002';

// ── Shape of the Python service response ─────────────────────────────────────
interface FraudFeatureResponse {
  identity: {
    account_age_days: number;
    device_id_uniqueness: number;      // 1 / (n_users_on_device + 1)
    device_switch_frequency: number;   // distinct devices last 7 days
    oauth_token_valid: boolean;
  };
  location: {
    gps_speed: number;                 // km/h
    gps_cell_distance: number;         // km between H3 cell centres
    h3_zone_consistency: number;       // 0–1, fraction in same cell last 24h
  };
  behavior: {
    claims_last_30d: number;
    trigger_frequency: number;         // claims / active day
    earnings_pattern_deviation: number;
  };
  meta: {
    h3_cell: string;
    timestamp: number;
  };
}

@Injectable()
export class FraudService {
  private readonly logger = new Logger(FraudService.name);

  constructor(private prisma: PrismaService) {}

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
  async analyzeFraud(userId: string, dto: AnalyzeFraudDto) {
    // 1. Fetch ML feature vector from Python service
    const features = await this.fetchFraudFeatures(userId, dto);

    // 2. Score with ML features OR fall back to simple heuristics
    let riskScore: number;
    let featureSource: string;

    if (features) {
      riskScore     = this.scoreFromFeatures(features, dto);
      featureSource = 'ml-fraud-feature-service';
      this.logger.log(`ML risk score for ${userId}: ${riskScore}`);
    } else {
      riskScore     = this.scoreFallback(dto);
      featureSource = 'heuristic-fallback';
      this.logger.warn(`Heuristic score for ${userId}: ${riskScore}`);
    }

    const status = riskScore > 60 ? 'INCONCLUSIVE' : 'APPROVED';

    // 3. Persist / upsert to DB
    const existing = await (this.prisma as any).fraudAnalysis.findUnique({
      where: { userId },
    });

    const analysisDetails = JSON.stringify(
      this.buildDetails(dto, riskScore, features, featureSource),
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
      ? await (this.prisma as any).fraudAnalysis.update({
          where: { userId },
          data:  dbData,
        })
      : await (this.prisma as any).fraudAnalysis.create({
          data: { userId, ...dbData },
        });

    return {
      message: 'Fraud analysis completed',
      data: {
        id:            result.id,
        riskScore:     result.riskScore,
        status:        result.status,
        featureSource,
        features:      features ?? null,
        analysis:      JSON.parse(result.analysisDetails ?? '{}'),
      },
    };
  }

  // ── Scoring: ML feature–based ─────────────────────────────────────────────
  private scoreFromFeatures(
    f: FraudFeatureResponse,
    dto: AnalyzeFraudDto,
  ): number {
    let score = 0;

    // Identity
    if (f.identity.account_age_days < 7)          score += 20; // brand-new
    if (f.identity.device_id_uniqueness < 0.3)    score += 15; // shared device
    if (f.identity.device_switch_frequency > 3)   score += 20; // 3+ switches/week

    // Location
    if (f.location.gps_speed > 150)               score += 25; // impossible speed
    if (f.location.h3_zone_consistency < 0.3)     score += 10; // erratic zone
    if (f.location.gps_cell_distance > 50)        score += 15; // giant cell jump

    // Behaviour
    if (f.behavior.claims_last_30d > 10)           score += 20;
    if (f.behavior.trigger_frequency > 1.0)        score += 15; // > 1 claim/day
    if (f.behavior.earnings_pattern_deviation > 1) score += 10;

    // Legacy device / network heuristics (kept for defence-in-depth)
    if (dto.deviceIntegrity === 'Rooted Device')     score += 20;
    if (dto.deviceIntegrity === 'Jailbroken Device') score += 25;
    if (dto.networkType === 'Premium VPN')           score += 15;
    if (dto.networkType === 'Proxy')                 score += 25;
    if (dto.velocityCheck === 'Suspicious')          score += 20;

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

  // ── Build analysis details store in DB ───────────────────────────────────
  private buildDetails(
    dto: AnalyzeFraudDto,
    riskScore: number,
    features: FraudFeatureResponse | null,
    featureSource: string,
  ) {
    const riskFactors: string[] = [];

    if (features) {
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
    } else {
      if (riskScore > 60)
        riskFactors.push('GPS signals exhibit inconsistent timing offsets');
      if (dto.deviceIntegrity === 'Rooted Device')
        riskFactors.push('Device integrity compromised');
      if (dto.networkType === 'Premium VPN')
        riskFactors.push('Premium VPN detected');
    }

    return {
      featureSource,
      gpsCoordinates: `${dto.gpsLatitude}, ${dto.gpsLongitude}`,
      mlFeatures:     features ?? 'unavailable',
      riskFactors,
    };
  }

  // ── Read-only / admin endpoints ───────────────────────────────────────────

  async getStatus(userId: string) {
    const analysis = await (this.prisma as any).fraudAnalysis.findUnique({
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
    const submissions = await (this.prisma as any).fraudAnalysis.findMany({
      where:   { status: 'INCONCLUSIVE' },
      include: { user: { select: { id: true, email: true, phone: true, createdAt: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return {
      total: submissions.length,
      submissions: submissions.map((sub: any) => ({
        analysisId: sub.id,
        userId:     sub.userId,
        email:      sub.user.email,
        phone:      sub.user.phone,
        riskScore:  sub.riskScore,
        status:     sub.status,
        createdAt:  sub.createdAt,
      })),
    };
  }

  async getSubmissionDetails(userId: string) {
    const analysis = await (this.prisma as any).fraudAnalysis.findUnique({
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
    const analysis = await (this.prisma as any).fraudAnalysis.update({
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
}
