import { Body, Controller, Get, HttpCode, HttpStatus, Param, Patch, Post, Request, UseGuards } from '@nestjs/common';
import { AdminGuard, JwtAuthGuard } from '../auth/jwt-auth.guard';
import { BasicIdentityDto, IdentityVerificationDto, PayoutSetupDto, PersonalDetailsDto } from './dto/kyc.dto';
import { KycService } from './kyc.service';

@Controller('kyc')
@UseGuards(JwtAuthGuard)
export class KycController {
  constructor(private readonly kycService: KycService) {}

  @Get('status')
  getStatus(@Request() req: any) {
    return this.kycService.getStatus(req.user.id);
  }

  @Post('basic-identity')
  @HttpCode(HttpStatus.OK)
  saveBasicIdentity(@Request() req: any, @Body() dto: BasicIdentityDto) {
    return this.kycService.saveBasicIdentity(req.user.id, dto);
  }

  @Post('personal-details')
  @HttpCode(HttpStatus.OK)
  savePersonalDetails(@Request() req: any, @Body() dto: PersonalDetailsDto) {
    return this.kycService.savePersonalDetails(req.user.id, dto);
  }

  @Post('identity-verification')
  @HttpCode(HttpStatus.OK)
  saveIdentityVerification(@Request() req: any, @Body() dto: IdentityVerificationDto) {
    return this.kycService.saveIdentityVerification(req.user.id, dto);
  }

  @Post('payout-setup')
  @HttpCode(HttpStatus.OK)
  savePayoutSetup(@Request() req: any, @Body() dto: PayoutSetupDto) {
    return this.kycService.savePayoutSetup(req.user.id, dto);
  }

  @Post('submit')
  @HttpCode(HttpStatus.OK)
  submit(@Request() req: any) {
    return this.kycService.submit(req.user.id);
  }

  // ── ADMIN KYC REVIEW ─────────────────────────────────────────────────────

  @Get('admin/submissions')
  @UseGuards(AdminGuard)
  @HttpCode(HttpStatus.OK)
  getSubmissions(@Request() req: any) {
    return this.kycService.getSubmissions();
  }

  @Get('admin/submission/:userId')
  @UseGuards(AdminGuard)
  @HttpCode(HttpStatus.OK)
  getSubmissionDetails(@Param('userId') userId: string) {
    return this.kycService.getSubmissionDetails(userId);
  }

  @Patch('admin/review/:userId')
  @UseGuards(AdminGuard)
  @HttpCode(HttpStatus.OK)
  reviewSubmission(
    @Param('userId') userId: string,
    @Body() dto: { status: 'APPROVED' | 'REJECTED'; reviewNote?: string },
  ) {
    return this.kycService.reviewSubmission(userId, dto.status, dto.reviewNote);
  }
}
