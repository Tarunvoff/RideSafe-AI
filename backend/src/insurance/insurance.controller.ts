import { Body, Controller, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { ProcessInsuranceRequestDto } from './dto/process-insurance.dto';
import { InsuranceService } from './insurance.service';

@Controller('insurance')
export class InsuranceController {
  constructor(private readonly insuranceService: InsuranceService) {}

  @Post('process/:driverId')
  @HttpCode(HttpStatus.OK)
  process(@Param('driverId') driverId: string, @Body() dto: ProcessInsuranceRequestDto) {
    return this.insuranceService.processInsurance(driverId, dto);
  }
}
