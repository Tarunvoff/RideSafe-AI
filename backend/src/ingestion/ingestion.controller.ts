import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { IngestionService } from './ingestion.service';

@Controller('ingestion')
export class IngestionController {
  constructor(private readonly ingestionService: IngestionService) {}

  @Get('test-sweep')
  @HttpCode(HttpStatus.OK)
  async forceTestIngestion() {
    // Manually force the AI Cron Job to trigger immediately instead of waiting 10 minutes
    await this.ingestionService.ingestFromNewsData();
    return {
      message: 'Manual NewsData & Gemini pipeline sweep explicitly finished. Check NestJS Server Console for live JSON logs.',
    };
  }
}
