import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { MockOAuthLoginDto } from './dto/mock-oauth-login.dto';
import { MockOAuthCallbackDto } from './dto/mock-oauth-callback.dto';
import { WeekKeyOverrideDto } from './dto/week-key-override.dto';
import { MockQCommerceService } from './mock-qcommerce.service';

@Controller('mock-qcommerce')
export class MockQCommerceController {
  constructor(private readonly mockQCommerceService: MockQCommerceService) {}

  @Post('oauth/login')
  @HttpCode(HttpStatus.OK)
  startOAuth(@Body() dto: MockOAuthLoginDto) {
    return this.mockQCommerceService.startOAuthLogin(dto);
  }

  @Post('oauth/callback')
  @HttpCode(HttpStatus.OK)
  completeOAuth(@Body() dto: MockOAuthCallbackDto) {
    return this.mockQCommerceService.completeOAuthCallback(dto);
  }

  @Get('drivers/:driverId/profile')
  @HttpCode(HttpStatus.OK)
  getDriverProfile(@Param('driverId') driverId: string) {
    return this.mockQCommerceService.getDriverProfile(driverId);
  }

  @Post('drivers/week-key-override')
  @HttpCode(HttpStatus.OK)
  setWeekKeyOverride(@Body() dto: WeekKeyOverrideDto) {
    return this.mockQCommerceService.setWeekKeyOverride(dto.weekKey);
  }
}
