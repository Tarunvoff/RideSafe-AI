import { IsNumber, IsOptional, IsString } from 'class-validator';

export class ProcessInsuranceRequestDto {
  @IsOptional()
  @IsNumber()
  lat?: number;

  @IsOptional()
  @IsNumber()
  lng?: number;

  @IsOptional()
  @IsString()
  deviceId?: string;

  @IsOptional()
  @IsString()
  upiId?: string;

  @IsOptional()
  @IsNumber()
  claimAmount?: number;

  @IsOptional()
  @IsString()
  eventType?: string;

  @IsOptional()
  @IsNumber()
  eventTimestamp?: number;

  @IsOptional()
  @IsNumber()
  accelerometerVariance?: number;

  @IsOptional()
  @IsNumber()
  barometricPressureHpa?: number;

  @IsOptional()
  @IsNumber()
  acousticMatchConfidence?: number;
}
