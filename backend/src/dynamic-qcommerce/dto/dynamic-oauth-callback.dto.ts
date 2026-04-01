import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { QCommerceProvider } from '../enums/qcommerce.enums';

export class DynamicOAuthCallbackDto {
  @IsEnum(QCommerceProvider)
  provider: QCommerceProvider;

  @IsUUID()
  sessionId: string;

  @IsString()
  code: string;

  @IsOptional()
  @IsString()
  state?: string;
}
