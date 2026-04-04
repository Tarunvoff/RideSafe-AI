import { Body, Controller, Get, HttpCode, HttpStatus, Post, Query, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PremiumCalculateQueryDto } from './dto/premium-calculate-query.dto';
import { WeeklyPremiumRequestDto } from './dto/weekly-premium.dto';
import { PremiumService } from './premium.service';

@Controller('premium')
export class PremiumController {
  constructor(private readonly premiumService: PremiumService) {}

  @Post('weekly')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  calculateWeekly(@Request() req: any, @Body() dto: WeeklyPremiumRequestDto) {
    const effectiveDriverId = req?.user?.id ?? dto.driverId;
    return this.premiumService.calculateWeeklyPremium(effectiveDriverId, dto.planId);
  }

  @Get('calculate')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async calculateForPlan(@Request() req: any, @Query() query: PremiumCalculateQueryDto) {
    const effectiveDriverId = req?.user?.id ?? query.driverId;
    const result = await this.premiumService.calculateWeeklyPremium(effectiveDriverId, query.planId);
    return {
      weeklyPremium: result.premium,
      breakdown: {
        Ew: result.Ew,
        Lf: result.Lf,
        Ct: result.Ct,
      },
    };
  }
}
