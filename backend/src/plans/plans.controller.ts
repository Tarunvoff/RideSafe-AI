import { Controller, Get, HttpCode, HttpStatus, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PlansService } from './plans.service';

@Controller('plans')
export class PlansController {
  constructor(private readonly plansService: PlansService) {}

  @Get('weekly')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  getWeeklyPlans(@Request() req: any) {
    return this.plansService.getWeeklyPlans(req.user.id);
  }

  @Get('me/purchased')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  getPurchased(@Request() req: any) {
    return this.plansService.getPurchasedPolicies(req.user.id);
  }
}

