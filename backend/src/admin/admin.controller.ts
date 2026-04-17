/** 
 * Intelligent Dashboard: Provides predictive analytics, loss-ratio monitoring, 
 * and operational transparency for insurers and platform administrators.
 *
 * For the admin control plane architecture, refer to ARCHITECTURE/ADMIN_CONTROL_PLANE.md.
 */
import { Body, Controller, Get, HttpCode, HttpStatus, Param, Patch, Post, Query, Request, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../auth/jwt-auth.guard';
import { AdminService } from './admin.service';

@Controller('admin')
@UseGuards(AdminGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('dashboard')
  @HttpCode(HttpStatus.OK)
  getDashboard() {
    return this.adminService.getDashboardSummary();
  }

  @Get('workers')
  @HttpCode(HttpStatus.OK)
  getWorkers(
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('risk') risk?: string,
    @Query('city') city?: string,
    @Query('platform') platform?: string,
    @Query('take') take?: string,
    @Query('skip') skip?: string,
  ) {
    return this.adminService.getWorkers({
      search,
      status,
      risk,
      city,
      platform,
      take: take ? Number(take) : undefined,
      skip: skip ? Number(skip) : undefined,
    });
  }

  @Get('claims')
  @HttpCode(HttpStatus.OK)
  getClaims(
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('type') type?: string,
    @Query('take') take?: string,
    @Query('skip') skip?: string,
  ) {
    return this.adminService.getClaims({
      search,
      status,
      type,
      take: take ? Number(take) : undefined,
      skip: skip ? Number(skip) : undefined,
    });
  }

  @Get('alerts')
  @HttpCode(HttpStatus.OK)
  getAlerts(@Query('take') take?: string, @Query('skip') skip?: string) {
    return this.adminService.getAlerts({
      take: take ? Number(take) : undefined,
      skip: skip ? Number(skip) : undefined,
    });
  }

  @Get('settings')
  @HttpCode(HttpStatus.OK)
  getSettings() {
    return this.adminService.getSettings();
  }

  @Patch('settings/:section')
  @HttpCode(HttpStatus.OK)
  updateSettings(@Param('section') section: string, @Body() payload: Record<string, any>) {
    return this.adminService.updateSettings(section, payload ?? {});
  }

  @Get('profile')
  @HttpCode(HttpStatus.OK)
  getProfile(@Request() req: any) {
    return this.adminService.getAdminProfile(req.user.id);
  }

  @Patch('profile')
  @HttpCode(HttpStatus.OK)
  updateProfile(@Request() req: any, @Body() dto: { displayName?: string; phone?: string }) {
    return this.adminService.updateAdminProfile(req.user.id, dto ?? {});
  }

  @Get('fraud/queue')
  @HttpCode(HttpStatus.OK)
  getFraudQueue(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.adminService.getFraudQueue({
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
    });
  }

  @Post('fraud/:analysisId/decision')
  @HttpCode(HttpStatus.OK)
  decideFraudCase(
    @Param('analysisId') analysisId: string,
    @Body() body: { decision: 'APPROVE' | 'REJECT'; note: string },
  ) {
    return this.adminService.decideFraudCase(analysisId, body);
  }

  @Get('disruptions/pending')
  @HttpCode(HttpStatus.OK)
  getPendingDisruptions() {
    return this.adminService.getPendingDisruptions();
  }

  @Post('disruptions/:id/verify')
  @HttpCode(HttpStatus.OK)
  verifyDisruption(
    @Param('id') id: string,
    @Body() body: { verified: boolean; adjustedLoss?: number },
  ) {
    return this.adminService.verifyDisruption(id, body);
  }
}
