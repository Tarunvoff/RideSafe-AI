import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { PlansController } from './plans.controller';
import { PlansService } from './plans.service';
import { DisruptionBootstrapService } from './disruption-bootstrap.service';

@Module({
  imports: [PrismaModule],
  controllers: [PlansController],
  providers: [PlansService, DisruptionBootstrapService],
})
export class PlansModule {}

