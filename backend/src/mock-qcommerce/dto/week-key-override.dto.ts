import { IsOptional, IsString, Matches } from 'class-validator';

export class WeekKeyOverrideDto {
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}$/)
  weekKey?: string;
}
