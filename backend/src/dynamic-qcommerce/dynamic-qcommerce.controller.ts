import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { DynamicOAuthLoginDto } from './dto/dynamic-oauth-login.dto';
import { DynamicOAuthCallbackDto } from './dto/dynamic-oauth-callback.dto';
import { WeekKeyOverrideDto } from './dto/week-key-override.dto';
import { DynamicQCommerceService } from './dynamic-qcommerce.service';

@Controller('dynamic-qcommerce')
export class DynamicQCommerceController {
  constructor(private readonly dynamicQCommerceService: DynamicQCommerceService) {}

  @Post('oauth/login')
  @HttpCode(HttpStatus.OK)
  startOAuth(@Body() dto: DynamicOAuthLoginDto) {
    return this.dynamicQCommerceService.startOAuthLogin(dto);
  }

  @Post('oauth/callback')
  @HttpCode(HttpStatus.OK)
  completeOAuth(@Body() dto: DynamicOAuthCallbackDto) {
    return this.dynamicQCommerceService.completeOAuthCallback(dto);
  }

  @Get('drivers/:driverId/profile')
  @HttpCode(HttpStatus.OK)
  getDriverProfile(@Param('driverId') driverId: string) {
    return this.dynamicQCommerceService.getDriverProfile(driverId);
  }

  @Post('drivers/week-key-override')
  @HttpCode(HttpStatus.OK)
  setWeekKeyOverride(@Body() dto: WeekKeyOverrideDto) {
    return this.dynamicQCommerceService.setWeekKeyOverride(dto.weekKey);
  }
}
