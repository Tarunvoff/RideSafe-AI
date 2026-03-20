import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { KycController } from './kyc.controller';
import { KycService } from './kyc.service';

@Module({
  imports: [PrismaModule],
  providers: [KycService],
  controllers: [KycController],
})
export class KycModule {}
