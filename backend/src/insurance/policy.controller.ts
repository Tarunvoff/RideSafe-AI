import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Request, UseGuards } from '@nestjs/common';
import { InsuranceService } from './insurance.service';
import { PolicyEnrollDto } from './dto/policy-enroll.dto';
import { CancelPolicyDto, RenewPolicyDto } from './dto/policy-manage.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('policy')
export class PolicyController {
  constructor(private readonly insuranceService: InsuranceService) {}

  @Post('enroll')
  @HttpCode(HttpStatus.CREATED)
  enroll(@Body() dto: PolicyEnrollDto) {
    return this.insuranceService.enrollPolicy(dto);
  }

  @Post('cancel')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  cancel(@Request() req: any, @Body() dto: CancelPolicyDto) {
    return this.insuranceService.cancelPolicy({
      driverId: req.user.id,
      reason: dto.reason,
    });
  }

  @Post('renew')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  renew(@Request() req: any, @Body() _dto: RenewPolicyDto) {
    return this.insuranceService.renewPolicy({
      driverId: req.user.id,
    });
  }

  @Get('status/:driverId')
  getStatus(@Param('driverId') driverId: string) {
    return this.insuranceService.getPolicyStatus(driverId);
  }
}
