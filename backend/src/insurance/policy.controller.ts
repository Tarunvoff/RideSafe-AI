import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { InsuranceService } from './insurance.service';
import { PolicyEnrollDto } from './dto/policy-enroll.dto';
import { CancelPolicyDto, RenewPolicyDto } from './dto/policy-manage.dto';

@Controller('policy')
export class PolicyController {
  constructor(private readonly insuranceService: InsuranceService) {}

  @Post('enroll')
  @HttpCode(HttpStatus.CREATED)
  enroll(@Body() dto: PolicyEnrollDto) {
    return this.insuranceService.enrollPolicy(dto);
  }

  @Post('cancel')
  @HttpCode(HttpStatus.OK)
  cancel(@Body() dto: CancelPolicyDto) {
    return this.insuranceService.cancelPolicy(dto);
  }

  @Post('renew')
  @HttpCode(HttpStatus.CREATED)
  renew(@Body() dto: RenewPolicyDto) {
    return this.insuranceService.renewPolicy(dto);
  }

  @Get('status/:driverId')
  getStatus(@Param('driverId') driverId: string) {
    return this.insuranceService.getPolicyStatus(driverId);
  }
}
