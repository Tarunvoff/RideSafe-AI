import { IsString, IsOptional } from 'class-validator';

export class CancelPolicyDto {
  @IsString()
  driverId: string;

  @IsString()
  @IsOptional()
  reason?: string;
}

export class RenewPolicyDto {
  @IsString()
  driverId: string;
}
