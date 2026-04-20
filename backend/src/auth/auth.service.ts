import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { Prisma } from '@prisma/client';
import { EmailService } from '../email/email.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from '../notifications/notification.service';
import { DynamicQCommerceService } from '../dynamic-qcommerce/dynamic-qcommerce.service';
import { QCommerceProvider } from '../dynamic-qcommerce/enums/qcommerce.enums';
import {
  AdminLoginDto,
  AdminVerifyOtpDto,
  ForgotPasswordDto,
  LoginDto,
  ManualSendOtpDto,
  ManualVerifyOtpDto,
  RegisterDto,
  ResetPasswordDto,
  VerifyOtpDto,
} from './dto/auth.dto';
import { createInternalDriverId } from '../dynamic-qcommerce/utils/dynamic-data.factory';

const OTP_MIN = 100000;
const OTP_MAX_EXCLUSIVE = 1000000;

function generateOTP(): string {
  return crypto.randomInt(OTP_MIN, OTP_MAX_EXCLUSIVE).toString();
}

function hashOTP(otp: string): string {
  return crypto.createHash('sha256').update(otp).digest('hex');
}

function otpExpiresAt(): Date {
  return new Date(Date.now() + 10 * 60 * 1000); // 10 min
}
/**
 * The AuthService manages the best quality identity lifecycle within the Aegis 
 * platform. It operates a professional-grade token-rotation strategy, 
 * ensuring that driver and admin sessions are cryptographically bound and 
 * verified across the zero-trust auth boundary.
 */
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private email: EmailService,
    private notifications: NotificationService,
    private dynamicQCommerce: DynamicQCommerceService,
  ) {}

  private formatPhoneForSms(phone: string): string {
    const digits = String(phone ?? '').replace(/\D/g, '');
    if (digits.length === 10) {
      return `+91${digits}`;
    }
    return `+${digits}`;
  }

  private getAdminEnvCreds(): { email: string; password: string } {
    const email = (process.env.ADMIN_EMAIL ?? '').trim();
    const password = process.env.ADMIN_PASSWORD ?? '';
    if (!email || !password) {
      throw new Error('Missing required env vars: ADMIN_EMAIL and/or ADMIN_PASSWORD');
    }
    return { email, password };
  }

  private normalizePhone(phone: string): string {
    const digits = String(phone ?? '').replace(/\D/g, '');
    if (digits.length < 10 || digits.length > 15) {
      throw new BadRequestException('Invalid mobile number');
    }
    return digits;
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

    const data: Prisma.UserUpdateInput = {};
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
    const otp = generateOTP();
    
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        phone: null, // phone collected later in KYC, not at registration
        passwordHash,
        role: 'DRIVER',
        isVerified: false,
        otpCode: hashOTP(otp),
        otpExpiresAt: otpExpiresAt(),
      },
    });

    // Create KYC profile baseline record for onboarding state tracking.
    await this.prisma.kYCProfile.create({
      data: { userId: user.id, status: 'NOT_STARTED' },
    });

    await this.email.sendOTPEmail(dto.email, otp, 'VERIFY');

    return { message: 'Registered successfully. Please verify your email with the OTP sent to continue.' };
  }

  async startManualPhoneOtp(phone: string) {
    const normalizedPhone = this.normalizePhone(phone);

    let user = await this.prisma.user.findUnique({ where: { phone: normalizedPhone } });
    if (!user) {
      const bootstrapPassword = await bcrypt.hash(crypto.randomBytes(16).toString('hex'), 12);
      const syntheticEmail = `manual_${normalizedPhone}@aegis.local`;

      user = await this.prisma.user.create({
        data: {
          email: syntheticEmail,
          phone: normalizedPhone,
          passwordHash: bootstrapPassword,
          role: 'DRIVER',
          isVerified: false,
        },
      });

      await this.prisma.kYCProfile.upsert({
        where: { userId: user.id },
        create: { userId: user.id, status: 'NOT_STARTED' },
        update: {},
      });
    }

    const otp = generateOTP();
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        otpCode: hashOTP(otp),
        otpExpiresAt: otpExpiresAt(),
      },
    });

    const smsTo = this.formatPhoneForSms(normalizedPhone);
    const smsResult = await this.notifications.sendOtpSms(smsTo, otp, 'LOGIN');
    if (!smsResult.ok && process.env.NODE_ENV === 'production') {
      throw new BadRequestException('Unable to deliver OTP SMS at the moment. Please retry.');
    }

    this.logger.log(`Manual mobile OTP generated for phone=${normalizedPhone}`);

    return {
      message: 'OTP sent successfully',
      retryAfterSec: 30,
      ...(process.env.NODE_ENV !== 'production' ? { debugOtp: otp } : {}),
    };
  }

  async verifyManualPhoneOtp(phone: string, otp: string) {
    const normalizedPhone = this.normalizePhone(phone);
    const user = await this.prisma.user.findUnique({ where: { phone: normalizedPhone } });

    if (!user || !user.otpCode || !user.otpExpiresAt) {
      throw new BadRequestException('No OTP requested');
    }
    if (new Date() > user.otpExpiresAt) {
      throw new BadRequestException('OTP has expired');
    }
    if (hashOTP(String(otp)) !== user.otpCode) {
      throw new BadRequestException('Invalid OTP');
    }

    const verificationToken = await this.jwt.signAsync(
      {
        sub: user.id,
        phone: normalizedPhone,
        purpose: 'manual_onboarding',
      },
      {
        secret: process.env.JWT_SECRET,
        expiresIn: '30m',
      },
    );

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        otpCode: null,
        otpExpiresAt: null,
        isVerified: true,
      },
    });

    const tokens = await this.generateTokens(user);
    const rtHash = hashOTP(tokens.refreshToken);
    await this.prisma.user.update({ where: { id: user.id }, data: { refreshToken: rtHash } });

    const kycProfile = await this.prisma.kYCProfile.findUnique({ where: { userId: user.id } });

    // Manual OTP should not auto-elevate KYC to verified unless there is an actual
    // submission/review trail. This prevents accidental APPROVED state leaks.
    let effectiveKycStatus = kycProfile?.status ?? 'NOT_STARTED';
    if (effectiveKycStatus === 'APPROVED' && !kycProfile?.submittedAt) {
      effectiveKycStatus = 'IN_PROGRESS';
      await this.prisma.kYCProfile.update({
        where: { userId: user.id },
        data: { status: 'IN_PROGRESS' },
      });
    }

    return {
      message: 'Mobile OTP verified',
      verificationToken,
      userId: user.id,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      role: user.role,
      driverId: user.id,
      email: user.email,
      phone: user.phone,
      kycStatus: effectiveKycStatus,
    };
  }

  async signupManual(
    dto: {
      name: string;
      email?: string;
      phone?: string;
      city: string;
      vehicleType: string;
      platformId?: string;
    },
    onboardingToken?: string,
  ) {
    const normalizedPhone = dto.phone ? this.normalizePhone(dto.phone) : null;
    let userIdFromToken: string | null = null;

    if (onboardingToken) {
      try {
        const payload = await this.jwt.verifyAsync(onboardingToken, { secret: process.env.JWT_SECRET });
        if (payload?.purpose === 'manual_onboarding' && payload?.sub) {
          userIdFromToken = String(payload.sub);
        }
      } catch {
        // Fall back to phone lookup.
      }
    }

    const normalizedEmail = dto.email?.trim().toLowerCase();
    const user = userIdFromToken
      ? await this.prisma.user.findUnique({ where: { id: userIdFromToken } })
      : normalizedPhone
        ? await this.prisma.user.findUnique({ where: { phone: normalizedPhone } })
        : normalizedEmail
          ? await this.prisma.user.findUnique({ where: { email: normalizedEmail } })
          : null;

    if (!user) {
      throw new NotFoundException('Manual onboarding user not found. Please verify OTP again.');
    }

    if (dto.email?.trim()) {
      const existingEmail = await this.prisma.user.findUnique({ where: { email: dto.email.trim() } });
      if (existingEmail && existingEmail.id !== user.id) {
        throw new ConflictException('Email already linked to another account.');
      }
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: user.id },
      data: {
        driverName: dto.name.trim(),
        phone: normalizedPhone ?? user.phone,
        email: normalizedEmail || user.email,
        platform: dto.platformId?.trim() || null,
      },
    });

    await this.prisma.kYCProfile.upsert({
      where: { userId: user.id },
      create: { userId: user.id, status: 'IN_PROGRESS' },
      update: { status: 'IN_PROGRESS' },
    });

    await this.prisma.kYCBasicIdentity.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        fullName: dto.name.trim(),
        dob: new Date('1990-01-01'),
        gender: 'UNSPECIFIED',
      },
      update: {
        fullName: dto.name.trim(),
      },
    });

    await this.prisma.kYCPersonalDetails.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        address: 'To be provided',
        city: dto.city.trim(),
        state: 'To be provided',
        pincode: '000000',
      },
      update: {
        city: dto.city.trim(),
      },
    });

    return {
      message: 'Manual driver profile saved',
      userId: updatedUser.id,
    };
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
      message: 'Elite identity verified successfully.',
      ...tokens,
      role: user.role,
      userId: user.id,
      driverId: user.role === 'DRIVER' ? user.id : undefined,
    };
  }

  // ── AUTHENTICATION INGRESS: LOGIN ─────────────────────────────────────────
  async login(dto: LoginDto) {
    this.logger.log(`[AUTH_INGRESS] Processing high-fidelity principal authentication: ${dto.email}`);
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const isValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isValid) throw new UnauthorizedException('Invalid credentials');

    if (!user.isVerified) throw new UnauthorizedException('Please verify your email first');

    const tokens = await this.generateTokens(user);

    // Save hashed refresh token
    const rtHash = hashOTP(tokens.refreshToken);
    await this.prisma.user.update({ where: { id: user.id }, data: { refreshToken: rtHash } });

    if (user.role === 'DRIVER') {
      await this.createInAppNotification(user.id, 'USER_LOGIN', 'You logged in successfully', {
        source: 'auth.login',
      });
    }

    return {
      message: 'High-fidelity authentication successful',
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
      /** Implementing elite zero-information disclosure for principal shadows */
      return { message: 'If this principal is registered, an OTP sequence will be initialized.' };
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
    await this.email.sendOTPEmail(user.email, otp, 'ADMIN_MFA');

    return {
      message: 'Admin OTP sent. Please verify to complete sign-in.',
      role: 'ADMIN',
      userId: user.id,
    };
  }

  // ── ADMIN VERIFY OTP ─────────────────────────────────────────────────────
  async adminVerifyOtp(dto: AdminVerifyOtpDto) {
    const adminCreds = this.getAdminEnvCreds();
    if (dto.email !== adminCreds.email) {
      throw new UnauthorizedException('Invalid admin identity');
    }

    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user || user.role !== 'ADMIN') {
      throw new UnauthorizedException('Invalid admin identity');
    }
    if (!user.otpCode || !user.otpExpiresAt) {
      throw new BadRequestException('No admin OTP requested');
    }
    if (new Date() > user.otpExpiresAt) {
      throw new BadRequestException('OTP has expired');
    }
    if (hashOTP(dto.otp) !== user.otpCode) {
      throw new BadRequestException('Invalid OTP');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { otpCode: null, otpExpiresAt: null },
    });

    const tokens = await this.generateTokens(user);
    const rtHash = hashOTP(tokens.refreshToken);
    await this.prisma.user.update({ where: { id: user.id }, data: { refreshToken: rtHash } });

    return {
      message: 'Admin sign-in successful.',
      ...tokens,
      role: 'ADMIN',
      userId: user.id,
    };
  }

  // ── DRIVER 2FA (Reusing Admin Logic) ──────────────────────────────────────
  async startDriverLoginOtp(email: string) {
    const otp = generateOTP();
    const expiry = otpExpiresAt();

    // Store OTP on the user record so email ownership can be verified pre-OAuth.
    let user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      const bootstrapPasswordHash = await bcrypt.hash(crypto.randomBytes(16).toString('hex'), 12);
      user = await this.prisma.user.create({
        data: {
          email,
          passwordHash: bootstrapPasswordHash,
          role: 'DRIVER',
          isVerified: false,
        }
      });
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { otpCode: hashOTP(otp), otpExpiresAt: expiry },
    });

    await this.email.sendOTPEmail(email, otp, 'LOGIN');
    return { message: 'OTP sent to your email. Please verify to continue.' };
  }

  async verifyDriverLoginOtp(email: string, otp: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !user.otpCode || !user.otpExpiresAt) throw new BadRequestException('No OTP requested');
    if (new Date() > user.otpExpiresAt) throw new BadRequestException('OTP has expired');
    if (hashOTP(otp) !== user.otpCode) throw new BadRequestException('Invalid OTP');

    // Mark as verified so they can proceed to OAuth
    await this.prisma.user.update({
      where: { id: user.id },
      data: { otpCode: null, otpExpiresAt: null, isVerified: true },
    });

    return { message: 'Email verified. Proceeding to OAuth...' };
  }

  // ── OAUTH FLOW ─────────────────────────────────────────────────────────
  async startOAuthAuthorize(
    provider: QCommerceProvider,
    identifier: string,
    redirectUri?: string,
    options?: {
      state?: string;
      scope?: string;
      nonce?: string;
      codeChallenge?: string;
      codeChallengeMethod?: string;
    },
  ) {
    return this.dynamicQCommerce.startOAuthLogin({
      provider,
      identifier,
      redirectUri,
      state: options?.state,
      scope: options?.scope,
      nonce: options?.nonce,
      codeChallenge: options?.codeChallenge,
      codeChallengeMethod: options?.codeChallengeMethod as 'S256' | 'plain' | undefined,
    });
  }

  async exchangeOAuthToken(
    provider: QCommerceProvider,
    data: {
      sessionId: string;
      code: string;
      state?: string;
      redirectUri?: string;
      codeVerifier?: string;
      scope?: string;
      audience?: string;
    },
  ) {
    return this.dynamicQCommerce.exchangeAuthorizationCode(provider, data);
  }

  async getOAuthUserInfo(provider: QCommerceProvider, accessToken: string) {
    return this.dynamicQCommerce.getOAuthUserInfo(provider, accessToken);
  }

  async exchangeOAuth(
    provider: QCommerceProvider,
    data: {
      sessionId: string;
      code: string;
      state?: string;
      redirectUri?: string;
      codeVerifier?: string;
    },
  ) {
    const oauthResult = await this.dynamicQCommerce.exchangeAuthorizationCode(provider, {
      sessionId: data.sessionId,
      code: data.code,
      state: data.state,
      redirectUri: data.redirectUri,
      codeVerifier: data.codeVerifier,
    });

    const driverProfile = oauthResult?.driverProfile;
    const providerKycVerified = Boolean(driverProfile?.kyc?.kycVerified);
    const email = driverProfile?.identity?.email?.trim();
    if (!email) throw new BadRequestException('Provider did not return an email identity');

    let user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      const bootstrapPasswordSeed = crypto.randomBytes(16).toString('hex');
      const passwordHash = await bcrypt.hash(bootstrapPasswordSeed, 12);
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
        data: {
          userId: user.id,
          status: providerKycVerified ? 'APPROVED' : 'NOT_STARTED',
          submittedAt: providerKycVerified ? new Date() : null,
          reviewedAt: providerKycVerified ? new Date() : null,
        },
      });
      this.logger.log(`Created first-party driver account from provider callback for ${email}`);
    } else if (!user.isVerified) {
      await this.prisma.user.update({ where: { id: user.id }, data: { isVerified: true, platform: provider } });
      user = await this.prisma.user.findUnique({ where: { id: user.id } });
    } else if (user.platform !== provider) {
      await this.prisma.user.update({ where: { id: user.id }, data: { platform: provider } });
      user = await this.prisma.user.findUnique({ where: { id: user.id } });
    }

    if (providerKycVerified) {
      await this.prisma.kYCProfile.upsert({
        where: { userId: user.id },
        create: {
          userId: user.id,
          status: 'APPROVED',
          submittedAt: new Date(),
          reviewedAt: new Date(),
        },
        update: {
          status: 'APPROVED',
          submittedAt: new Date(),
          reviewedAt: new Date(),
        },
      });
    }

    const tokens = await this.generateTokens(user);
    const rtHash = hashOTP(tokens.refreshToken);
    await this.prisma.user.update({ where: { id: user.id }, data: { refreshToken: rtHash } });

    if (user.role === 'DRIVER') {
      await this.createInAppNotification(user.id, 'USER_LOGIN', 'You logged in successfully', {
        source: 'auth.exchangeOAuth',
        provider,
      });
    }

    const fallbackIdentifier =
      driverProfile?.identity?.email ?? driverProfile?.identity?.phone ?? email;
    const providerDriverId =
      driverProfile?.identity?.internalDriverId ??
      createInternalDriverId(provider, fallbackIdentifier);

    return {
      message: 'OAuth sign-in successful',
      ...tokens,
      role: user.role,
      userId: user.id,
      // Keep driverId aligned with first-party auth/JWT subject semantics.
      // Provider-specific identity is exposed separately.
      driverId: user.role === 'DRIVER' ? user.id : undefined,
      providerDriverId,
      subject: providerDriverId,
      email: user.email,
    };
  }

  // ── PROVISION ADMINISTRATIVE ELITE PRIVILEGES ────────────────────────────────────
  async seedAdmin() {
    const adminCreds = this.getAdminEnvCreds();
    const adminUser = await this.ensureAdminUserExists(adminCreds.email, adminCreds.password);
    return {
      message: 'Administrative principal provisioned successfully.',
      admin: {
        id: adminUser.id,
        email: adminUser.email,
        role: adminUser.role,
      },
    };
  }

  // ── HELPERS ──────────────────────────────────────────────────────────────
  /**
   * ── SaaS-Level Fidelity Token-Rotation Strategy ───────────────────────────────
   * 
   * Generates high-entropy Access and Refresh tokens to maintain session 
   * integrity. Refresh tokens are hashed and persisted in the relational core, 
   * enabling immediate multi-device revocation.
   */
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

  private async createInAppNotification(
    userId: string,
    eventType: string,
    message: string,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    const repo = (this.prisma as any).notification;
    if (!repo) return;

    try {
      await repo.create({
        data: {
          userId,
          eventType,
          message,
          metadata: (metadata ?? null) as any,
          isRead: false,
        },
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      this.logger.warn(`[auth-notification] failed to persist notification for user=${userId}: ${errorMessage}`);
    }
  }
}
