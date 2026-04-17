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

  @IsOptional()
  @IsNumber()
  altitudeAccuracy?: number;

  @IsOptional()
  @IsNumber() // Represented as 0 or 1 for legacy compatibility if needed
  isMocked?: number;

  @IsOptional()
  @IsString()
  mockProvider?: string;

  @IsOptional()
  @IsNumber()
  developerMode?: number;
}
