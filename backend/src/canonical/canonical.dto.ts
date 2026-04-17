import { Type } from 'class-transformer';
import { IsBoolean, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreatePolicyDto {
  @IsString()
  @IsNotEmpty()
  plan!: string;

  @IsOptional()
  @IsString()
  workerId?: string;
}

export class PremiumCalculateDto {
  @IsOptional()
  @IsString()
  workerId?: string;

  @IsOptional()
  @IsString()
  planId?: string;
}

export class TriggerEvaluateDto {
  @IsOptional()
  @IsString()
  workerId?: string;

  @IsOptional()
  @IsString()
  h3Cell?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  lat?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  lng?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  fraudScore?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  eventTimestamp?: number;
}

export class TriggerSimulateDto {
  @IsString()
  @IsNotEmpty()
  h3Cell!: string;

  @IsOptional()
  @IsString()
  zoneState?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  lfScore?: number;
}

export class ManualClaimTriggerDto {
  @IsOptional()
  @IsString()
  workerId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  lat?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  lng?: number;

  @IsOptional()
  @IsString()
  h3Cell?: string;

  @IsOptional()
  @IsString()
  eventType?: string;
}

export class PayoutInitiateDto {
  @IsOptional()
  @IsString()
  workerId?: string;

  @IsString()
  @IsNotEmpty()
  claimId!: string;
}

export class FraudCheckDto {
  @IsOptional()
  @IsString()
  workerId?: string;

  @Type(() => Number)
  @IsNumber()
  gpsLatitude!: number;

  @Type(() => Number)
  @IsNumber()
  gpsLongitude!: number;

  @IsOptional()
  @IsString()
  deviceId?: string;

  @IsOptional()
  @IsString()
  upiId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  claimAmount?: number;

  @IsOptional()
  @IsString()
  eventType?: string;
}

export class DisruptionVerifyDto {
  @IsBoolean()
  verified!: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  adjustedLoss?: number;
}
