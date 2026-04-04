import { IsString } from 'class-validator';

export class PremiumCalculateQueryDto {
  @IsString()
  driverId: string;

  @IsString()
  planId: string;
}
