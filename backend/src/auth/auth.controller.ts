import {
  ForbiddenException,
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode, HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Request,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { AuthService } from './auth.service';
import {
    AdminLoginDto, AdminVerifyOtpDto,
    ForgotPasswordDto,
    LoginDto, RefreshTokenDto,
    RegisterDto,
    ResetPasswordDto,
    VerifyOtpDto,
    UpdateDriverNameDto,
  OAuthExchangeDto,
  OAuthTokenDto,
} from './dto/auth.dto';
import { AdminGuard, JwtAuthGuard } from './jwt-auth.guard';
import { QCommerceProvider } from '../dynamic-qcommerce/enums/qcommerce.enums';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // ── DRIVER AUTH ──────────────────────────────────────────────────────────

  @Post('register')
  @HttpCode(HttpStatus.OK)
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('verify-otp')
  @HttpCode(HttpStatus.OK)
  verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.authService.verifyOtp(dto);
  }

  @Post('driver/send-otp')
  @HttpCode(HttpStatus.OK)
  sendDriverOtp(@Body('email') email: string) {
    return this.authService.startDriverLoginOtp(email);
  }

  @Post('driver/verify-otp')
  @HttpCode(HttpStatus.OK)
  verifyDriverOtp(@Body() dto: VerifyOtpDto) {
    return this.authService.verifyDriverLoginOtp(dto.email, dto.otp);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refresh(@Body() dto: RefreshTokenDto) {
    // Refresh token itself is enough to authenticate this endpoint.
    // This keeps refresh working even when the access token expires.
    return this.authService.refresh(dto.refreshToken);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  logout(@Request() req: any) {
    return this.authService.logout(req.user.id);
  }

  @Patch('update-driver-name')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  updateDriverName(@Request() req: any, @Body() dto: UpdateDriverNameDto) {
    return this.authService.updateDriverName(req.user.id, dto.driverName);
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  // ── ADMIN AUTH ───────────────────────────────────────────────────────────

  @Post('admin/login')
  @HttpCode(HttpStatus.OK)
  adminLogin(@Body() dto: AdminLoginDto) {
    return this.authService.adminLogin(dto);
  }

  @Post('admin/verify-otp')
  @HttpCode(HttpStatus.OK)
  adminVerifyOtp(@Body() dto: AdminVerifyOtpDto) {
    return this.authService.adminVerifyOtp(dto);
  }

  // ── SEED ADMIN ───────────────────────────────────────────────────────────

  @Post('seed/create-admin')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AdminGuard)
  seedAdmin() {
    if (process.env.NODE_ENV === 'production') {
      throw new ForbiddenException('Admin seed endpoint is disabled in production');
    }
    return this.authService.seedAdmin();
  }

  // ── OAUTH ──────────────────────────────────────────────────────────────

  @Get(':provider/authorize')
  async authorizeOAuth(
    @Param('provider') provider: string,
    @Query('identifier') identifier: string,
    @Query('redirectUri') redirectUri: string,
    @Query('state') oauthState: string,
    @Query('scope') scope: string,
    @Query('nonce') nonce: string,
    @Query('code_challenge') codeChallenge: string,
    @Query('code_challenge_method') codeChallengeMethod: string,
    @Res() res: Response,
  ) {
    const normalized = String(provider || '').toLowerCase();
    if (!normalized || !(Object.values(QCommerceProvider) as string[]).includes(normalized)) {
      throw new BadRequestException('Unsupported provider');
    }
    if (!identifier) throw new BadRequestException('Missing identifier');

    const safeRedirect = redirectUri || 'aegis://oauth-callback';
    const session = await this.authService.startOAuthAuthorize(
      normalized as QCommerceProvider,
      identifier,
      safeRedirect,
      {
        state: oauthState,
        scope,
        nonce,
        codeChallenge,
        codeChallengeMethod,
      },
    );

    const sessionId = session?.oauthSession?.sessionId;
    const issuedState = session?.oauthSession?.state;
    const code = session?.oauthSession?.authCode;
    if (!sessionId || !code) {
      throw new BadRequestException('OAuth session could not be initialized');
    }

    const sep = safeRedirect.includes('?') ? '&' : '?';
    const redirectUrl = `${safeRedirect}${sep}code=${encodeURIComponent(code)}&sessionId=${encodeURIComponent(sessionId)}&state=${encodeURIComponent(issuedState ?? '')}&provider=${encodeURIComponent(normalized)}`;
    return res.redirect(redirectUrl);
  }

  @Post(':provider/exchange')
  @HttpCode(HttpStatus.OK)
  async exchangeOAuth(@Param('provider') provider: string, @Body() dto: OAuthExchangeDto) {
    const normalized = String(provider || '').toLowerCase();
    if (!normalized || !(Object.values(QCommerceProvider) as string[]).includes(normalized)) {
      throw new BadRequestException('Unsupported provider');
    }
    if (!dto?.sessionId || !dto?.code) throw new BadRequestException('Missing OAuth session data');

    return this.authService.exchangeOAuth(normalized as QCommerceProvider, {
      sessionId: dto.sessionId,
      code: dto.code,
      state: dto.state,
      redirectUri: dto.redirectUri,
      codeVerifier: dto.codeVerifier,
    });
  }

  @Post(':provider/token')
  @HttpCode(HttpStatus.OK)
  async tokenOAuth(@Param('provider') provider: string, @Body() dto: OAuthTokenDto) {
    const normalized = String(provider || '').toLowerCase();
    if (!normalized || !(Object.values(QCommerceProvider) as string[]).includes(normalized)) {
      throw new BadRequestException('Unsupported provider');
    }

    if (!dto?.sessionId || !dto?.code) {
      throw new BadRequestException('Missing OAuth code exchange payload');
    }

    return this.authService.exchangeOAuthToken(normalized as QCommerceProvider, {
      sessionId: dto.sessionId,
      code: dto.code,
      state: dto.state,
      redirectUri: dto.redirectUri,
      codeVerifier: dto.codeVerifier,
      scope: dto.scope,
      audience: dto.audience,
    });
  }

  @Get(':provider/userinfo')
  @HttpCode(HttpStatus.OK)
  async oauthUserInfo(@Param('provider') provider: string, @Request() req: any) {
    const normalized = String(provider || '').toLowerCase();
    if (!normalized || !(Object.values(QCommerceProvider) as string[]).includes(normalized)) {
      throw new BadRequestException('Unsupported provider');
    }

    const authHeader = String(req.headers?.authorization ?? '');
    const prefix = 'Bearer ';
    if (!authHeader.startsWith(prefix)) {
      throw new BadRequestException('Missing bearer token');
    }
    const accessToken = authHeader.slice(prefix.length).trim();
    if (!accessToken) {
      throw new BadRequestException('Missing bearer token');
    }

    return this.authService.getOAuthUserInfo(normalized as QCommerceProvider, accessToken);
  }
}
