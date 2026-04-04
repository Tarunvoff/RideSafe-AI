import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { EmailService } from '../email/email.service';
import { PrismaService } from '../prisma/prisma.service';
import { DynamicQCommerceService } from '../dynamic-qcommerce/dynamic-qcommerce.service';
import { QCommerceProvider } from '../dynamic-qcommerce/enums/qcommerce.enums';
import {
  AdminLoginDto,
  AdminVerifyOtpDto,
  ForgotPasswordDto,
  LoginDto,
  RegisterDto,
  ResetPasswordDto,
  VerifyOtpDto,
} from './dto/auth.dto';
import { createInternalDriverId } from '../dynamic-qcommerce/utils/dynamic-data.factory';

function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function hashOTP(otp: string): string {
  return crypto.createHash('sha256').update(otp).digest('hex');
}

function otpExpiresAt(): Date {
  return new Date(Date.now() + 10 * 60 * 1000); // 10 min
}

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private email: EmailService,
    private dynamicQCommerce: DynamicQCommerceService,
  ) {}

  private getAdminEnvCreds(): { email: string; password: string } {
    const email = (process.env.ADMIN_EMAIL ?? '').trim();
    const password = process.env.ADMIN_PASSWORD ?? '';
    if (!email || !password) {
      throw new Error('Missing required env vars: ADMIN_EMAIL and/or ADMIN_PASSWORD');
    }
    return { email, password };
  }

  private async ensureAdminUserExists(email: string, password: string) {
    const existing = await this.prisma.user.findUnique({ where: { email } });

    if (!existing) {
      const passwordHash = await bcrypt.hash(password, 12);
      return this.prisma.user.create({
        data: {
          email,
          phone: '+1-admin',
          passwordHash,
          role: 'ADMIN',
          isVerified: true,
        },
      });
    }

    const needsRoleUpdate = existing.role !== 'ADMIN';
    const needsVerifyUpdate = !existing.isVerified;
    const passwordMatches = await bcrypt.compare(password, existing.passwordHash);

    if (!needsRoleUpdate && !needsVerifyUpdate && passwordMatches) return existing;

    const data: any = {};
    if (needsRoleUpdate) data.role = 'ADMIN';
    if (needsVerifyUpdate) data.isVerified = true;
    if (!passwordMatches) data.passwordHash = await bcrypt.hash(password, 12);

    return this.prisma.user.update({ where: { id: existing.id }, data });
  }

  // ── DRIVER REGISTER ─────────────────────────────────────────────────────
  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email already registered');

    const passwordHash = await bcrypt.hash(dto.password, 12);
    
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        phone: null, // phone collected later in KYC, not at registration
        passwordHash,
        role: 'DRIVER',
        isVerified: true, // auto-verify on registration, no OTP required
      },
    });

    // Create KYC profile placeholder
    await this.prisma.kYCProfile.create({
      data: { userId: user.id, status: 'NOT_STARTED' },
    });

    return { message: 'Registered successfully. You can now log in.' };
  }

  // ── VERIFY OTP ──────────────────────────────────────────────────────────
  async verifyOtp(dto: VerifyOtpDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) throw new NotFoundException('User not found');
    if (user.isVerified) throw new BadRequestException('Email already verified');

    if (!user.otpCode || !user.otpExpiresAt) throw new BadRequestException('No OTP requested');
    if (new Date() > user.otpExpiresAt) throw new BadRequestException('OTP has expired');
    if (hashOTP(dto.otp) !== user.otpCode) throw new BadRequestException('Invalid OTP');

    await this.prisma.user.update({
      where: { id: user.id },
      data: { isVerified: true, otpCode: null, otpExpiresAt: null },
    });

    const tokens = await this.generateTokens(user);
    return {
      message: 'Email verified successfully.',
      ...tokens,
      role: user.role,
      userId: user.id,
      driverId: user.role === 'DRIVER' ? user.id : undefined,
    };
  }

  // ── LOGIN ────────────────────────────────────────────────────────────────
  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const isValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isValid) throw new UnauthorizedException('Invalid credentials');

    if (!user.isVerified) throw new UnauthorizedException('Please verify your email first');

    const tokens = await this.generateTokens(user);

    // Save hashed refresh token
    const rtHash = hashOTP(tokens.refreshToken);
    await this.prisma.user.update({ where: { id: user.id }, data: { refreshToken: rtHash } });

    return {
      message: 'Login successful',
      ...tokens,
      role: user.role,
      userId: user.id,
      driverId: user.role === 'DRIVER' ? user.id : undefined,
    };
  }

  // ── REFRESH TOKEN ────────────────────────────────────────────────────────
  async refresh(incomingToken: string) {
    // Decode refresh token to get user id.
    const refreshSecret = process.env.JWT_REFRESH_SECRET ?? process.env.JWT_SECRET;
    if (!refreshSecret) throw new UnauthorizedException('Missing refresh secret');

    let payload: any;
    try {
      payload = await this.jwt.verifyAsync(incomingToken, { secret: refreshSecret });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const userId: string | undefined = payload?.sub;
    if (!userId) throw new UnauthorizedException('Invalid refresh token');

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.refreshToken) throw new UnauthorizedException('No active session');

    if (hashOTP(incomingToken) !== user.refreshToken) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const tokens = await this.generateTokens(user);
    const rtHash = hashOTP(tokens.refreshToken);
    await this.prisma.user.update({ where: { id: user.id }, data: { refreshToken: rtHash } });
    return tokens;
  }

  // ── LOGOUT ───────────────────────────────────────────────────────────────
  async logout(userId: string) {
    await this.prisma.user.update({ where: { id: userId }, data: { refreshToken: null } });
    return { message: 'Logged out successfully' };
  }

  // ── UPDATE DRIVER NAME ─────────────────────────────────────────────────────
  async updateDriverName(userId: string, driverName: string) {
    const trimmedName = driverName.trim();
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    await this.prisma.$transaction(async tx => {
      await tx.user.update({
        where: { id: userId },
        data: { driverName: trimmedName },
      });

      const basicIdentity = await tx.kYCBasicIdentity.findUnique({ where: { userId } });
      if (basicIdentity) {
        // Keep the KYC display name in sync so profile screens show the latest value after re-login.
        await tx.kYCBasicIdentity.update({
          where: { userId },
          data: { fullName: trimmedName },
        });
      }
    });

    return { message: 'Driver name updated successfully', driverName: trimmedName };
  }

  // ── FORGOT PASSWORD ──────────────────────────────────────────────────────
  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) {
      // Don't reveal if email exists
      return { message: 'If this email is registered, you will receive an OTP.' };
    }

    const otp = generateOTP();
    await this.prisma.user.update({
      where: { id: user.id },
      data: { otpCode: hashOTP(otp), otpExpiresAt: otpExpiresAt() },
    });

    await this.email.sendOTPEmail(dto.email, otp, 'RESET');
    return { message: 'If this email is registered, you will receive an OTP.' };
  }

  // ── RESET PASSWORD ───────────────────────────────────────────────────────
  async resetPassword(dto: ResetPasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user || !user.otpCode || !user.otpExpiresAt) throw new BadRequestException('No reset requested');
    if (new Date() > user.otpExpiresAt) throw new BadRequestException('OTP has expired');
    if (hashOTP(dto.otp) !== user.otpCode) throw new BadRequestException('Invalid OTP');

    const passwordHash = await bcrypt.hash(dto.newPassword, 12);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { passwordHash, otpCode: null, otpExpiresAt: null },
    });
    return { message: 'Password reset successfully. Please login.' };
  }

  // ── ADMIN LOGIN ──────────────────────────────────────────────────────────
  async adminLogin(dto: AdminLoginDto) {
    const adminCreds = this.getAdminEnvCreds();
    if (dto.email !== adminCreds.email || dto.password !== adminCreds.password) {
      throw new UnauthorizedException('Invalid admin credentials');
    }

    const user = await this.ensureAdminUserExists(adminCreds.email, adminCreds.password);

    const otp = generateOTP();
    await this.prisma.user.update({
      where: { id: user.id },
      data: { otpCode: hashOTP(otp), otpExpiresAt: otpExpiresAt() },
    });

    // Always deliver admin MFA OTP to the configured admin inbox
    await this.email.sendOTPEmail(adminCreds.email, otp, 'ADMIN_MFA');
    return { message: 'OTP sent to your admin email. Please verify to complete sign-in.' };
  }

  // ── ADMIN VERIFY OTP ─────────────────────────────────────────────────────
  async adminVerifyOtp(dto: AdminVerifyOtpDto) {
    const adminCreds = this.getAdminEnvCreds();
    if (dto.email !== adminCreds.email) {
      throw new UnauthorizedException('Invalid admin credentials');
    }

    const user = await this.prisma.user.findFirst({
      where: { email: adminCreds.email, role: 'ADMIN' },
    });
    if (!user || !user.otpCode || !user.otpExpiresAt) throw new BadRequestException('No OTP requested');
    if (new Date() > user.otpExpiresAt) throw new BadRequestException('OTP has expired');
    if (hashOTP(dto.otp) !== user.otpCode) throw new BadRequestException('Invalid OTP');

    await this.prisma.user.update({
      where: { id: user.id },
      data: { otpCode: null, otpExpiresAt: null, isVerified: true },
    });

    const tokens = await this.generateTokens(user);
    const rtHash = hashOTP(tokens.refreshToken);
    await this.prisma.user.update({ where: { id: user.id }, data: { refreshToken: rtHash } });

    return { message: 'Admin sign-in successful.', ...tokens, role: 'ADMIN' };
  }

  // ── OAUTH FLOW ─────────────────────────────────────────────────────────
  async startOAuthAuthorize(provider: QCommerceProvider, identifier: string, redirectUri?: string) {
    return this.dynamicQCommerce.startOAuthLogin({ provider, identifier, redirectUri });
  }

  async exchangeOAuth(provider: QCommerceProvider, data: { sessionId: string; code: string; state?: string }) {
    const oauthResult = this.dynamicQCommerce.completeOAuthCallback({
      provider,
      sessionId: data.sessionId,
      code: data.code,
      state: data.state,
    });

    const driverProfile = oauthResult?.driverProfile;
    const email = driverProfile?.identity?.email?.trim();
    if (!email) throw new BadRequestException('Provider did not return an email identity');

    let user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      const tempPassword = crypto.randomBytes(16).toString('hex');
      const passwordHash = await bcrypt.hash(tempPassword, 12);
      user = await this.prisma.user.create({
        data: {
          email,
          phone: null,
          passwordHash,
          role: 'DRIVER',
          isVerified: true,
          driverName: driverProfile?.identity?.fullName ?? null,
          platform: provider,
        },
      });

      await this.prisma.kYCProfile.create({
        data: { userId: user.id, status: 'NOT_STARTED' },
      });
    } else if (!user.isVerified) {
      await this.prisma.user.update({ where: { id: user.id }, data: { isVerified: true, platform: provider } });
      user = await this.prisma.user.findUnique({ where: { id: user.id } });
    } else if (user.platform !== provider) {
      await this.prisma.user.update({ where: { id: user.id }, data: { platform: provider } });
      user = await this.prisma.user.findUnique({ where: { id: user.id } });
    }

    const tokens = await this.generateTokens(user);
    const rtHash = hashOTP(tokens.refreshToken);
    await this.prisma.user.update({ where: { id: user.id }, data: { refreshToken: rtHash } });

    const fallbackIdentifier =
      driverProfile?.identity?.email ?? driverProfile?.identity?.phone ?? email;
    const driverId =
      driverProfile?.identity?.internalDriverId ??
      createInternalDriverId(provider, fallbackIdentifier);

    return {
      message: 'OAuth sign-in successful',
      ...tokens,
      role: user.role,
      userId: user.id,
      driverId,
      email: user.email,
    };
  }

  // ── SEED ADMIN ───────────────────────────────────────────────────────────
  async seedAdmin() {
    const adminCreds = this.getAdminEnvCreds();
    const adminUser = await this.ensureAdminUserExists(adminCreds.email, adminCreds.password);
    return {
      message: 'Admin ensured successfully!',
      admin: {
        id: adminUser.id,
        email: adminUser.email,
        role: adminUser.role,
      },
    };
  }

  // ── HELPERS ──────────────────────────────────────────────────────────────
  private async generateTokens(user: { id: string; email: string; role: string }) {
    const payload = { sub: user.id, email: user.email, role: user.role };
    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(payload, {
        secret: process.env.JWT_SECRET,
        expiresIn: process.env.JWT_EXPIRES_IN ?? '20m',
      }),
      this.jwt.signAsync(payload, {
        secret: process.env.JWT_REFRESH_SECRET ?? process.env.JWT_SECRET,
        expiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
      }),
    ]);
    return { accessToken, refreshToken };
  }
}
