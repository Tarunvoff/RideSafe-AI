import {
    Body,
    Controller,
    HttpCode, HttpStatus,
    Post,
    Request,
    UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import {
    AdminLoginDto, AdminVerifyOtpDto,
    ForgotPasswordDto,
    LoginDto, RefreshTokenDto,
    RegisterDto,
    ResetPasswordDto,
    VerifyOtpDto,
} from './dto/auth.dto';
import { JwtAuthGuard } from './jwt-auth.guard';

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

  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  refresh(@Request() req: any, @Body() dto: RefreshTokenDto) {
    return this.authService.refresh(req.user.id, dto.refreshToken);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  logout(@Request() req: any) {
    return this.authService.logout(req.user.id);
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
  seedAdmin() {
    return this.authService.seedAdmin();
  }
}
