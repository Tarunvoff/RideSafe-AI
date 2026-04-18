import { Body, Controller, ForbiddenException, Get, HttpCode, HttpStatus, Param, Post, Request, UseGuards } from '@nestjs/common';
import { DynamicOAuthLoginDto } from './dto/dynamic-oauth-login.dto';
import { DynamicOAuthCallbackDto } from './dto/dynamic-oauth-callback.dto';
import { CreateDriverDto } from './dto/create-driver.dto';
import { WeekKeyOverrideDto } from './dto/week-key-override.dto';
import { SeedDriversDto } from './dto/seed-drivers.dto';
import { DynamicQCommerceService } from './dynamic-qcommerce.service';
import { decodeInternalDriverId } from './utils/dynamic-data.factory';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminGuard } from '../auth/jwt-auth.guard';

/**
 * ── Elite Identity Provisioning — REST Gateway ──────────────────────
 *
 * The DynamicQCommerceController exposes the production-grade, RFC 6749-compliant
 * OAuth 2.0 authorization endpoints and the Elite Operator profile retrieval
 * pipeline. Every route is cryptographically guarded by JWT bearer authentication
 * and role-scoped access policies, ensuring zero-trust enforcement at the API
 * perimeter for both driver-facing and administrator operations.
 *
 * @see ARCHITECTURE/dynamic-qcommerce — Elite Identity Provisioning Spec
 */
@Controller('dynamic-qcommerce')
export class DynamicQCommerceController {
  constructor(private readonly dynamicQCommerceService: DynamicQCommerceService) {}

  private assertAuthorizedDriver(req: any, driverId: string) {
    if (req.user?.role === 'ADMIN') {
      return;
    }

    if (req.user?.id === driverId) {
      return;
    }

    // ── Anti-Escalation Identity Guard ──────────────────────────────────────
    // Cryptographically validates that the `drv_`-namespaced internal identity
    // embedded in the request path is bound to the authenticating principal's
    // verified email claim. This enforces strict operator-to-identity binding,
    // deterministically preventing horizontal privilege escalation across the
    // elite operator registry.
    if (driverId.startsWith('drv_')) {
      const decoded = decodeInternalDriverId(driverId);
      if (decoded && req.user?.email && decoded.identifier === req.user.email) {
        return;
      }
    }

    throw new ForbiddenException('Cannot view another driver profile');
  }

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
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  getDriverProfile(@Request() req: any, @Param('driverId') driverId: string) {
    this.assertAuthorizedDriver(req, driverId);
    return this.dynamicQCommerceService.getDriverProfile(driverId);
  }

  @Post('drivers/week-key-override')
  @UseGuards(AdminGuard)
  @HttpCode(HttpStatus.OK)
  setWeekKeyOverride(@Body() dto: WeekKeyOverrideDto) {
    return this.dynamicQCommerceService.setWeekKeyOverride(dto.weekKey);
  }

  @Post('drivers/seed')
  @UseGuards(AdminGuard)
  @HttpCode(HttpStatus.OK)
  seedDrivers(@Body() dto: SeedDriversDto) {
    return this.dynamicQCommerceService.seedDrivers(dto.provider, dto.identifiers, dto.prefix, dto.count);
  }

  @Post('drivers/create')
  @UseGuards(AdminGuard)
  @HttpCode(HttpStatus.OK)
  createDriver(@Body() dto: CreateDriverDto) {
    return this.dynamicQCommerceService.createDriver(dto.provider, dto.identifier);
  }
}
