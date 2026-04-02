import { Body, Controller, HttpCode, HttpStatus, Param, Post, Get, NotFoundException } from '@nestjs/common';
import { ProcessInsuranceRequestDto } from './dto/process-insurance.dto';
import { InsuranceService } from './insurance.service';
import { ClaimOrchestratorService } from './claim-orchestrator.service';

@Controller('insurance')
export class InsuranceController {
  constructor(
    private readonly insuranceService: InsuranceService,
    private readonly claimOrchestrator: ClaimOrchestratorService,
  ) {}

  @Post('process/:driverId')
  @HttpCode(HttpStatus.OK)
  process(@Param('driverId') driverId: string, @Body() dto: ProcessInsuranceRequestDto) {
    return this.insuranceService.processInsurance(driverId, dto);
  }

  @Get('test-orchestrator')
  async triggerOrchestrator() {
    if (process.env.NODE_ENV === 'production') {
      throw new NotFoundException('Cannot GET /api/insurance/test-orchestrator');
    }
    await this.claimOrchestrator.orchestrateAutoClaims();
    return { success: true, message: 'Orchestrator triggered manually' };
  }
}
