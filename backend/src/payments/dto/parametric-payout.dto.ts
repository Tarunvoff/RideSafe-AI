import { IsNumber, IsString, Min } from 'class-validator';

export class ParametricPayoutDto {
  @IsString()
  policyId: string;

  @IsString()
  disruptionEventId: string;

  @IsNumber()
  eventTimestamp: number;

  @IsString()
  h3Cell: string;

  @IsNumber()
  @Min(0)
  approvedPayout: number;
}
