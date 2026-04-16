import { Body, Controller, ForbiddenException, Get, HttpCode, HttpStatus, Param, Post, Request, UseGuards } from '@nestjs/common';
import { InsuranceService } from './insurance.service';
import { PolicyEnrollDto } from './dto/policy-enroll.dto';
import { CancelPolicyDto, RenewPolicyDto } from './dto/policy-manage.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('policy')
@UseGuards(JwtAuthGuard)
export class PolicyController {
  constructor(private readonly insuranceService: InsuranceService) {}

  private resolveAuthorizedDriverId(req: any, requestedDriverId?: string) {
    if (req.user?.role === 'ADMIN') {
      return requestedDriverId ?? req.user.id;
    }

    if (requestedDriverId && requestedDriverId !== req.user.id) {
      throw new ForbiddenException('Cannot access or modify another driver policy');
    }

    return req.user.id;
  }

  @Post('enroll')
  @HttpCode(HttpStatus.CREATED)
  enroll(@Request() req: any, @Body() dto: PolicyEnrollDto) {
    const driverId = this.resolveAuthorizedDriverId(req, dto.driverId);
    return this.insuranceService.enrollPolicy({
      driverId,
      plan: dto.plan,
    });
  }

  @Post('cancel')
  @HttpCode(HttpStatus.OK)
  cancel(@Request() req: any, @Body() dto: CancelPolicyDto) {
    return this.insuranceService.cancelPolicy({
      driverId: req.user.id,
      reason: dto.reason,
    });
  }

  @Post('renew')
  @HttpCode(HttpStatus.CREATED)
  renew(@Request() req: any, @Body() _dto: RenewPolicyDto) {
    return this.insuranceService.renewPolicy({
      driverId: req.user.id,
    });
  }

  @Get('status/:driverId')
  getStatus(@Request() req: any, @Param('driverId') driverId: string) {
    const authorizedDriverId = this.resolveAuthorizedDriverId(req, driverId);
    return this.insuranceService.getPolicyStatus(authorizedDriverId);
  }
}
