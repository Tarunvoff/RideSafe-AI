import { IsEnum, IsString } from 'class-validator';
import { QCommerceProvider } from '../enums/qcommerce.enums';

export class CreateDriverDto {
  @IsEnum(QCommerceProvider)
  provider: QCommerceProvider;

  @IsString()
  identifier: string;
}
