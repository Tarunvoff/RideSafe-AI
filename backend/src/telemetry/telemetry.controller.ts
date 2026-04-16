import { Controller, Post, Body, HttpCode, HttpStatus, ForbiddenException, Request, UseGuards } from '@nestjs/common';
import { TelemetryService } from './telemetry.service';
import { GpsTelemetryDto } from './dto/gps-telemetry.dto';
import { LocationFailureDto } from './dto/location-failure.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('telemetry')
export class TelemetryController {
  constructor(private readonly telemetryService: TelemetryService) {}

  private resolveAuthorizedDriverId(req: any, requestedDriverId?: string) {
    if (req.user?.role === 'ADMIN') {
      return requestedDriverId ?? req.user.id;
    }

    if (requestedDriverId && requestedDriverId !== req.user.id) {
      throw new ForbiddenException('Cannot submit telemetry for another driver');
    }

    return req.user.id;
  }

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

  @Post('gps')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  ingestGps(@Request() req: any, @Body() dto: GpsTelemetryDto) {
    const driverId = this.resolveAuthorizedDriverId(req, dto.driverId);
    this.telemetryService.publishGpsTelemetry({
      ...dto,
      driverId,
    }).subscribe({ error: () => undefined });
    return {
      status: 'accepted',
      driverId,
      timestamp: dto.timestamp ?? Math.floor(Date.now() / 1000),
    };
  }

  @Post('location-failure')
  @HttpCode(HttpStatus.OK)
  reportLocationFailure(@Body() dto: LocationFailureDto) {
    this.telemetryService.reportLocationFailure(dto);
    return { status: 'accepted' };
  }
}
