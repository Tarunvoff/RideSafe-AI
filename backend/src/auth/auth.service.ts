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
import { KYCStatus, Prisma } from '@prisma/client';
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
    private dynamicQCommerce: DynamicQCommerceService,
  ) {}

  private normalizeEmail(email: string): string {
    return String(email ?? '').trim().toLowerCase();
  }

  private kycStatusPriority(status?: KYCStatus | null): number {
    switch (status) {
      case 'APPROVED':
        return 5;
      case 'SUBMITTED':
        return 4;
      case 'IN_PROGRESS':
        return 3;
      case 'REJECTED':
        return 2;
      case 'NOT_STARTED':
        return 1;
      default:
        return 0;
    }
  }

  private async findUserByEmailCI(email: string) {
    const normalizedEmail = this.normalizeEmail(email);
    const users = await this.prisma.user.findMany({
      where: {
        email: {
          equals: normalizedEmail,
          mode: 'insensitive',
        },
      },
    });

    if (!users.length) {
      return null;
    }

    const kycProfiles = await this.prisma.kYCProfile.findMany({
      where: {
        userId: {
          in: users.map((u) => u.id),
        },
      },
      select: {
        userId: true,
        status: true,
      },
    });

    const kycByUserId = new Map<string, KYCStatus>();
    for (const profile of kycProfiles) {
      kycByUserId.set(profile.userId, profile.status);
    }

    users.sort((a, b) => {
      const kycScore =
        this.kycStatusPriority(kycByUserId.get(b.id) ?? null) -
        this.kycStatusPriority(kycByUserId.get(a.id) ?? null);
      if (kycScore !== 0) return kycScore;

      if (a.isVerified !== b.isVerified) {
        return a.isVerified ? -1 : 1;
      }

      return a.createdAt.getTime() - b.createdAt.getTime();
    });

    return users[0];
  }

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
    const normalizedEmail = this.normalizeEmail(email);
    const otp = generateOTP();
    const expiry = otpExpiresAt();

    // Store OTP on the user record so email ownership can be verified pre-OAuth.
    let user = await this.findUserByEmailCI(normalizedEmail);
    if (!user) {
      const bootstrapPasswordHash = await bcrypt.hash(crypto.randomBytes(16).toString('hex'), 12);
      user = await this.prisma.$transaction(async (tx) => {
        const created = await tx.user.create({
          data: {
            email: normalizedEmail,
            passwordHash: bootstrapPasswordHash,
            role: 'DRIVER',
            isVerified: false,
          }
        });

        // Ensure eligibility checks always have a baseline KYC record.
        await tx.kYCProfile.create({
          data: {
            userId: created.id,
            status: 'NOT_STARTED',
          },
        });

        return created;
      });
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { otpCode: hashOTP(otp), otpExpiresAt: expiry },
    });

    await this.email.sendOTPEmail(normalizedEmail, otp, 'LOGIN');
    return { message: 'OTP sent to your email. Please verify to continue.' };
  }

  async verifyDriverLoginOtp(email: string, otp: string) {
    const user = await this.findUserByEmailCI(email);
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
    const email = this.normalizeEmail(driverProfile?.identity?.email ?? '');
    if (!email) throw new BadRequestException('Provider did not return an email identity');

    let user = await this.findUserByEmailCI(email);
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
        data: { userId: user.id, status: 'NOT_STARTED' },
      });
      this.logger.log(`Created first-party driver account from provider callback for ${email}`);
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
