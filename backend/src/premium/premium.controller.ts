import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { WeeklyPremiumRequestDto } from './dto/weekly-premium.dto';
import { PremiumService } from './premium.service';

@Controller('premium')
export class PremiumController {
  constructor(private readonly premiumService: PremiumService) {}

  @Post('weekly')
  @HttpCode(HttpStatus.OK)
  calculateWeekly(@Body() dto: WeeklyPremiumRequestDto) {
    return this.premiumService.calculateWeeklyPremium(dto.driverId);
  }
}
