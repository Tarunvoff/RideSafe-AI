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
import {
    AdminLoginDto,
    AdminVerifyOtpDto,
    ForgotPasswordDto,
    LoginDto,
    RegisterDto,
    ResetPasswordDto,
    VerifyOtpDto,
} from './dto/auth.dto';

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
  ) {}

  // ── DRIVER REGISTER ─────────────────────────────────────────────────────
  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email already registered');

    // Check if phone is already taken
    if (dto.phone) {
      const phoneExists = await this.prisma.user.findUnique({ where: { phone: dto.phone } });
      if (phoneExists) throw new ConflictException('Phone number already registered');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const otp = generateOTP();
    const otpHash = hashOTP(otp);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        phone: dto.phone || null,
        passwordHash,
        role: 'DRIVER',
        otpCode: otpHash,
        otpExpiresAt: otpExpiresAt(),
      },
    });

    // Create KYC profile placeholder
    await this.prisma.kYCProfile.create({
      data: { userId: user.id, status: 'NOT_STARTED' },
    });

    await this.email.sendOTPEmail(dto.email, otp, 'VERIFY');
    return { message: 'Registered successfully. Please check your email for the OTP.' };
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
    return { message: 'Email verified successfully.', ...tokens };
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

    return { message: 'Login successful', ...tokens, role: user.role };
  }

  // ── REFRESH TOKEN ────────────────────────────────────────────────────────
  async refresh(userId: string, incomingToken: string) {
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
    const user = await this.prisma.user.findFirst({
      where: { email: dto.email, role: 'ADMIN' },
    });
    if (!user) throw new UnauthorizedException('Invalid admin credentials');

    const isValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isValid) throw new UnauthorizedException('Invalid admin credentials');

    const otp = generateOTP();
    await this.prisma.user.update({
      where: { id: user.id },
      data: { otpCode: hashOTP(otp), otpExpiresAt: otpExpiresAt() },
    });

    await this.email.sendOTPEmail(dto.email, otp, 'ADMIN_MFA');
    return { message: 'OTP sent to your admin email. Please verify to complete sign-in.' };
  }

  // ── ADMIN VERIFY OTP ─────────────────────────────────────────────────────
  async adminVerifyOtp(dto: AdminVerifyOtpDto) {
    const user = await this.prisma.user.findFirst({
      where: { email: dto.email, role: 'ADMIN' },
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

  // ── SEED ADMIN ───────────────────────────────────────────────────────────
  async seedAdmin() {
    const existingAdmin = await this.prisma.user.findFirst({
      where: { email: 'suryaravichandran5555@gmail.com' },
    });

    if (existingAdmin) {
      return { message: 'Admin already exists', admin: { email: existingAdmin.email, id: existingAdmin.id } };
    }

    const passwordHash = await bcrypt.hash('surya@100416', 12);
    const adminUser = await this.prisma.user.create({
      data: {
        email: 'suryaravichandran5555@gmail.com',
        phone: '+1-admin-100416',
        passwordHash,
        role: 'ADMIN',
        isVerified: true,
      },
    });

    return { 
      message: 'Admin seeded successfully!',
      admin: {
        id: adminUser.id,
        email: adminUser.email,
        role: adminUser.role,
      },
      credentials: {
        email: 'suryaravichandran5555@gmail.com',
        password: 'surya@100416',
      }
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
