import { IsNumber, IsOptional, IsString } from 'class-validator';

export class AnalyzeFraudDto {
  @IsNumber()
  gpsLatitude: number;

  @IsNumber()
  gpsLongitude: number;

  @IsOptional()
  @IsString()
  deviceIntegrity?: string;

  @IsOptional()
  @IsString()
  networkType?: string;

  @IsOptional()
  @IsString()
  velocityCheck?: string;
}

export class ReviewFraudDto {
  @IsString()
  status: 'APPROVED' | 'REJECTED' | 'INCONCLUSIVE';

  @IsOptional()
  @IsString()
  reviewNote?: string;
}
