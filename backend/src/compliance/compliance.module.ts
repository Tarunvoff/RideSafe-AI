import { Module } from '@nestjs/common';
import { ComplianceController } from './compliance.controller';
import { ReserveSustainabilityService } from './reserve-sustainability.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ComplianceController],
  providers: [ReserveSustainabilityService],
})
export class ComplianceModule {}
