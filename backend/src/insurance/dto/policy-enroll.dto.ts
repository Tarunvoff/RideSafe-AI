import { IsIn, IsString } from 'class-validator';

export class PolicyEnrollDto {
  @IsString()
  driverId: string;

  @IsString()
  @IsIn(['BASIC', 'STANDARD', 'PREMIUM'])
  plan: string;
}
