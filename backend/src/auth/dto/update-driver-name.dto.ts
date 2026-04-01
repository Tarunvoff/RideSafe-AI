import { IsNotEmpty, IsString, MinLength, MaxLength } from 'class-validator';

export class UpdateDriverNameDto {
  @IsNotEmpty()
  @IsString()
  @MinLength(2, { message: 'Name must be at least 2 characters long' })
  @MaxLength(50, { message: 'Name must not exceed 50 characters' })
  driverName: string;
}
