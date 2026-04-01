import { IsNumber, IsOptional, IsString } from 'class-validator';

export class GpsTelemetryDto {
  @IsString()
  driverId: string;

  @IsNumber()
  lat: number;

  @IsNumber()
  lng: number;

  @IsOptional()
  @IsNumber()
  speed?: number;

  @IsOptional()
  @IsNumber()
  timestamp?: number;

  @IsOptional()
  @IsString()
  platform?: string;
}
