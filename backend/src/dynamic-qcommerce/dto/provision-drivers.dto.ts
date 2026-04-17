import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { QCommerceProvider } from '../enums/qcommerce.enums';

export class ProvisionDriversDto {
  @IsEnum(QCommerceProvider)
  provider: QCommerceProvider;

  @IsOptional()
  identifiers?: string[];

  @IsOptional()
  @IsString()
  prefix?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  count?: number;
}
