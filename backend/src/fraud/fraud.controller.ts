import { Body, Controller, Get, HttpCode, HttpStatus, Param, Patch, Post, Request, UseGuards } from '@nestjs/common';
import { AdminGuard, JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AnalyzeFraudDto, ReviewFraudDto } from './dto/fraud.dto';
import { FraudService } from './fraud.service';

@Controller('fraud')
@UseGuards(JwtAuthGuard)
export class FraudController {
  constructor(private readonly fraudService: FraudService) {}

  @Post('analyze')
  @HttpCode(HttpStatus.OK)
  analyzeFraud(@Request() req: any, @Body() dto: AnalyzeFraudDto) {
    return this.fraudService.analyzeFraud(req.user.id, dto);
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
