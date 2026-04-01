import { IsString } from 'class-validator';

export class WeeklyPremiumRequestDto {
  @IsString()
  driverId: string;
}
