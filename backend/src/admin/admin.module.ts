import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ComplianceModule } from '../compliance/compliance.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { ForecastService } from './forecast.service';

@Module({
  imports: [PrismaModule, ComplianceModule],
  controllers: [AdminController],
  providers: [AdminService, ForecastService],
  exports: [AdminService, ForecastService],
})
export class AdminModule {}
