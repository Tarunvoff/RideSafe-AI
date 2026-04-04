import { IsOptional, IsString } from 'class-validator';

export class WeeklyPremiumRequestDto {
  @IsString()
  driverId: string;

  @IsOptional()
  @IsString()
  planId?: string;
}
