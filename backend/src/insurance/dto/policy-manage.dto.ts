import { IsString, IsOptional } from 'class-validator';

export class CancelPolicyDto {
  @IsOptional()
  @IsString()
  driverId?: string;

  @IsString()
  @IsOptional()
  reason?: string;
}

export class RenewPolicyDto {
  @IsOptional()
  @IsString()
  driverId?: string;
}
