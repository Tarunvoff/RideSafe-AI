import { IsString, IsOptional, IsEnum, IsDateString } from 'class-validator';

export class BasicIdentityDto {
  @IsString()
  fullName: string;

  @IsDateString()
  dob: string;

  @IsString()
  gender: string;
}

export class PersonalDetailsDto {
  @IsString()
  address: string;

  @IsString()
  city: string;

  @IsString()
  state: string;

  @IsString()
  pincode: string;
}

export class IdentityVerificationDto {
  @IsString()
  aadhaarNumber: string;

  @IsString()
  panNumber: string;

  @IsOptional()
  @IsString()
  aadhaarDocUrl?: string;

  @IsOptional()
  @IsString()
  panDocUrl?: string;
}

export enum PayoutMethod {
  UPI = 'UPI',
  BANK = 'BANK',
}

export class PayoutSetupDto {
  @IsEnum(PayoutMethod)
  method: PayoutMethod;

  @IsOptional()
  @IsString()
  upiId?: string;

  @IsOptional()
  @IsString()
  accountNumber?: string;

  @IsOptional()
  @IsString()
  ifscCode?: string;

  @IsOptional()
  @IsString()
  accountHolder?: string;

  @IsOptional()
  @IsString()
  bankName?: string;
}
