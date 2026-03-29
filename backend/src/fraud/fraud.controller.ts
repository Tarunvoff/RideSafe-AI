import { Body, Controller, Get, HttpCode, HttpStatus, Param, Patch, Post, Request, UseGuards } from '@nestjs/common';
import { AdminGuard, JwtAuthGuard } from '../auth/jwt-auth.guard';
import { KafkaProducerService } from '../kafka/kafka.producer.service';
import { AnalyzeFraudDto, ReviewFraudDto } from './dto/fraud.dto';
import { FraudService } from './fraud.service';

@Controller('fraud')
@UseGuards(JwtAuthGuard)
export class FraudController {
  constructor(
    private readonly fraudService: FraudService,
    private readonly kafkaProducerService: KafkaProducerService,
  ) {}

  @Post('analyze')
  @HttpCode(HttpStatus.OK)
  async analyzeFraud(@Request() req: any, @Body() dto: AnalyzeFraudDto) {
    const result = await this.fraudService.analyzeFraud(req.user.id, dto);

    this.kafkaProducerService
      .publishDriverLocation({
        rider_id: req.user.id,
        lat: dto.gpsLatitude,
        lng: dto.gpsLongitude,
        timestamp: new Date().toISOString(),
        platform: 'mobile-app',
      })
      .subscribe({ error: () => undefined });

    return result;
  }

  @Get('status')
  getStatus(@Request() req: any) {
    return this.fraudService.getStatus(req.user.id);
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
