import { IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { QCommerceProvider } from '../enums/qcommerce.enums';

export class MockOAuthLoginDto {
  @IsEnum(QCommerceProvider)
  provider: QCommerceProvider;

  @IsString()
  @MinLength(4)
  @MaxLength(64)
  identifier: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  redirectUri?: string;
}
