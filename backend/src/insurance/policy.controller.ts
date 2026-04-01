import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { InsuranceService } from './insurance.service';
import { PolicyEnrollDto } from './dto/policy-enroll.dto';

@Controller('policy')
export class PolicyController {
  constructor(private readonly insuranceService: InsuranceService) {}

  @Post('enroll')
  @HttpCode(HttpStatus.CREATED)
  enroll(@Body() dto: PolicyEnrollDto) {
    return this.insuranceService.enrollPolicy(dto);
  }
}
