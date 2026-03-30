import { Module } from '@nestjs/common';
import { IngestionService } from './ingestion.service';
import { PrismaModule } from '../prisma/prisma.module';

import { IngestionController } from './ingestion.controller';

@Module({
  imports: [PrismaModule],
  controllers: [IngestionController],
  providers: [IngestionService],
})
export class IngestionModule {}
