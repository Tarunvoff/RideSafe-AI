import { IsNumber, IsOptional, IsString } from 'class-validator';

export class TriggerEvaluateRequestDto {
  @IsString()
  driverId: string;

  @IsOptional()
  @IsString()
  h3Cell?: string;

  @IsOptional()
  @IsNumber()
  fraudScore?: number;

  @IsOptional()
  @IsNumber()
  eventTimestamp?: number;

  @IsOptional()
  @IsNumber()
  lat?: number;

  @IsOptional()
  @IsNumber()
  lng?: number;
}
