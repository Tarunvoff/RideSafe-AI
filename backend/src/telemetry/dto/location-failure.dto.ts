import { IsOptional, IsString } from 'class-validator';

export class LocationFailureDto {
  @IsString()
  reason: string;

  @IsOptional()
  @IsString()
  platform?: string;
}
