import { IsNumber, IsOptional, IsString } from 'class-validator';

export class PayoutCalculateRequestDto {
  @IsString()
  driverId: string;

  @IsOptional()
  @IsNumber()
  Ew?: number;

  @IsOptional()
  @IsNumber()
  Lf?: number;

  @IsOptional()
  @IsNumber()
  Ct?: number;
}

export class PayoutProcessRequestDto {
  @IsString()
  driverId: string;

  @IsOptional()
  @IsNumber()
  payoutAmount?: number;

  @IsOptional()
  @IsString()
  h3Cell?: string;

  @IsOptional()
  @IsNumber()
  eventTimestamp?: number;

  @IsOptional()
  @IsString()
  policyId?: string;

  @IsOptional()
  @IsString()
  disruptionType?: string;
}
