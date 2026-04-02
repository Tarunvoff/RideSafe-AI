import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { DynamicOAuthLoginDto } from './dto/dynamic-oauth-login.dto';
import { DynamicOAuthCallbackDto } from './dto/dynamic-oauth-callback.dto';
import { CreateDriverDto } from './dto/create-driver.dto';
import { WeekKeyOverrideDto } from './dto/week-key-override.dto';
import { SeedDriversDto } from './dto/seed-drivers.dto';
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

  @Post('drivers/seed')
  @HttpCode(HttpStatus.OK)
  seedDrivers(@Body() dto: SeedDriversDto) {
    return this.dynamicQCommerceService.seedDrivers(dto.provider, dto.identifiers, dto.prefix, dto.count);
  }

  @Post('drivers/create')
  @HttpCode(HttpStatus.OK)
  createDriver(@Body() dto: CreateDriverDto) {
    return this.dynamicQCommerceService.createDriver(dto.provider, dto.identifier);
  }
}
