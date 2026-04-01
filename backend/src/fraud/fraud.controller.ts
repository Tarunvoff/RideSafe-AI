import { Body, Controller, Get, HttpCode, HttpStatus, Param, Patch, Post, Query, Request, UseGuards } from '@nestjs/common';
import { AdminGuard, JwtAuthGuard } from '../auth/jwt-auth.guard';
import { KafkaProducerService } from '../kafka/kafka.producer.service';
import { ZoneMonitoringService } from '../kafka/zone-monitoring.service';
import { AnalyzeFraudDto, ReviewFraudDto } from './dto/fraud.dto';
import { FraudService } from './fraud.service';
import * as h3 from 'h3-js';

@Controller('fraud')
@UseGuards(JwtAuthGuard)
export class FraudController {
  constructor(
    private readonly fraudService: FraudService,
    private readonly kafkaProducerService: KafkaProducerService,
    private readonly zoneMonitoringService: ZoneMonitoringService,
  ) {}

  @Post('analyze')
  @HttpCode(HttpStatus.OK)
  async analyzeFraud(@Request() req: any, @Body() dto: AnalyzeFraudDto): Promise<any> {
    const result = await this.fraudService.analyzeFraud(req.user.id, dto);

    this.kafkaProducerService
      .publishDriverLocation({
        driverId: req.user.id,
        lat: dto.gpsLatitude,
        lng: dto.gpsLongitude,
        timestamp: Math.floor(Date.now() / 1000),
        platform: 'mobile-app',
      })
      .subscribe({ error: () => undefined });

    try {
      const h3_cell = h3.latLngToCell(dto.gpsLatitude, dto.gpsLongitude, 8);
      const zoneState = await this.zoneMonitoringService.getZoneState(h3_cell);
      
      if (result && result.data && result.data.analysis) {
        result.data.analysis.zoneState = zoneState;
      }
    } catch (e) {
      // Ignore gracefully
    }

    return result;
  }

  @Get('status')
  getStatus(@Request() req: any) {
    return this.fraudService.getStatus(req.user.id);
  }

  @Get('zone-risk')
  async getLiveZoneRisk(@Query('lat') lat: number, @Query('lng') lng: number) {
    if (!lat || !lng) return {};
    const resolution = 8;
    const h3_cell = h3.latLngToCell(Number(lat), Number(lng), resolution);
    return this.zoneMonitoringService.getZoneState(h3_cell);
  }

  // ── ADMIN ENDPOINTS ──────────────────────────────────────────────────────

  @Get('admin/submissions')
  @UseGuards(AdminGuard)
  @HttpCode(HttpStatus.OK)
  getSubmissions() {
    return this.fraudService.getSubmissions();
  }

  @Get('admin/submission/:userId')
  @UseGuards(AdminGuard)
  @HttpCode(HttpStatus.OK)
  getSubmissionDetails(@Param('userId') userId: string) {
    return this.fraudService.getSubmissionDetails(userId);
  }

  @Patch('admin/review/:userId')
  @UseGuards(AdminGuard)
  @HttpCode(HttpStatus.OK)
  reviewSubmission(@Param('userId') userId: string, @Body() dto: ReviewFraudDto) {
    return this.fraudService.reviewSubmission(userId, dto);
  }
}
