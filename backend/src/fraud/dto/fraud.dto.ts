import { IsNumber, IsOptional, IsString } from 'class-validator';

export class AnalyzeFraudDto {
  // ── GPS coordinates (required) ────────────────────────────────────────────
  @IsNumber()
  gpsLatitude: number;

  @IsNumber()
  gpsLongitude: number;

  // ── Real-time fields forwarded to Python fraud-feature-service ────────────
  @IsOptional()
  @IsString()
  deviceId?: string;       // Current device ID from mobile app

  @IsOptional()
  @IsString()
  upiId?: string;          // Linked UPI / payment identity

  @IsOptional()
  @IsNumber()
  claimAmount?: number;    // Claim amount in ₹ (0 if not a claim event)

  @IsOptional()
  @IsString()
  eventType?: string;      // e.g. ZONE_HALTED, GPS_PING, CLAIM_SUBMITTED

  // ── Legacy device / network fields (kept for heuristic fallback) ──────────
  @IsOptional()
  @IsString()
  deviceIntegrity?: string; // 'Rooted Device' | 'Jailbroken Device' | null

  @IsOptional()
  @IsString()
  networkType?: string;     // 'Premium VPN' | 'Proxy' | null

  @IsOptional()
  @IsString()
  velocityCheck?: string;   // 'Suspicious' | null

  @IsOptional()
  @IsNumber()
  altitudeAccuracy?: number;

  @IsOptional()
  @IsNumber()
  isMocked?: number;

  @IsOptional()
  @IsString()
  mockProvider?: string;

  @IsOptional()
  @IsNumber()
  developerMode?: number;
}

export class ReviewFraudDto {
  @IsString()
  status: 'APPROVED' | 'REJECTED' | 'INCONCLUSIVE' | 'ESCALATED';

  @IsOptional()
  @IsString()
  reviewNote?: string;
}
