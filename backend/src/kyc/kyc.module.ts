import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { KycController } from './kyc.controller';
import { ManualKycController } from './manual-kyc.controller';
import { KycUploadController } from './kyc-upload.controller';
import { KycService } from './kyc.service';

@Module({
  imports: [PrismaModule],
  providers: [KycService],
  controllers: [KycController, KycUploadController, ManualKycController],
})
export class KycModule {}
