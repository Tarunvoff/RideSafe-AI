import { IsNumber, IsOptional, IsString, IsIn } from 'class-validator';

export class DriverDemoTriggerDto {
  @IsOptional()
  @IsString()
  @IsIn(['RAIN', 'TRAFFIC', 'FLOOD'])
  scenario?: 'RAIN' | 'TRAFFIC' | 'FLOOD';

  @IsOptional()
  @IsString()
  h3Cell?: string;

  @IsOptional()
  @IsNumber()
  fraudScore?: number;

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
