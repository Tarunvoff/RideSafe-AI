import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { TelemetryService } from './telemetry.service';

@Controller('telemetry')
export class TelemetryController {
  constructor(private readonly telemetryService: TelemetryService) {}

  @Post('ingest-batch')
  @HttpCode(HttpStatus.CREATED)
  async ingestHighVolumeTelemetryBatch(@Body() body: any) {
    if (!body.events || !Array.isArray(body.events)) {
      return { error: 'Payload must contain a vast array of telemetry [events].' };
    }
    const result = await this.telemetryService.ingestHighVolumeTelemetry(body.events);
    return {
      message: 'TimescaleDB Data Warehouse Successfully Committed Pipeline Events.',
      archived: result.count
    };
  }
}
