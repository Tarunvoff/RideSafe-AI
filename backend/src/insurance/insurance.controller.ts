import { Body, Controller, ForbiddenException, HttpCode, HttpStatus, Param, Post, Get, NotFoundException, Request, UseGuards } from '@nestjs/common';
import { ProcessInsuranceRequestDto } from './dto/process-insurance.dto';
import { DriverDemoTriggerDto } from './dto/demo-trigger.dto';
import { InsuranceService } from './insurance.service';
import { ClaimOrchestratorService } from './claim-orchestrator.service';
import { AdminGuard, JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('insurance')
@UseGuards(JwtAuthGuard)
export class InsuranceController {
  constructor(
    private readonly insuranceService: InsuranceService,
    private readonly claimOrchestrator: ClaimOrchestratorService,
  ) {}

  private resolveAuthorizedDriverId(req: any, requestedDriverId: string) {
    if (req.user?.role === 'ADMIN') {
      return requestedDriverId;
    }

    if (req.user?.id !== requestedDriverId) {
      throw new ForbiddenException('Cannot process insurance for another driver');
    }

    return req.user.id;
  }

  @Post('process/:driverId')
  @HttpCode(HttpStatus.OK)
  process(@Request() req: any, @Param('driverId') driverId: string, @Body() dto: ProcessInsuranceRequestDto) {
    const authorizedDriverId = this.resolveAuthorizedDriverId(req, driverId);
    return this.insuranceService.processInsurance(authorizedDriverId, dto);
  }

  @Post('demo-trigger-flow')
  @HttpCode(HttpStatus.OK)
  triggerDemoFlow(@Request() req: any, @Body() dto: DriverDemoTriggerDto) {
    return this.insuranceService.runDriverDemoTriggerFlow(req.user.id, dto);
  }

  @Get('test-orchestrator')
  @UseGuards(AdminGuard)
  async triggerOrchestrator() {
    if (process.env.NODE_ENV === 'production') {
      throw new NotFoundException('Cannot GET /api/insurance/test-orchestrator');
    }
    await this.claimOrchestrator.orchestrateAutoClaims();
    return { success: true, message: 'Orchestrator triggered manually' };
  }
}
