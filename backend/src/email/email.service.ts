import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  async sendOTPEmail(to: string, otp: string, purpose: 'VERIFY' | 'RESET' | 'ADMIN_MFA' | 'LOGIN' = 'VERIFY') {
    console.log(`[EmailService] Attempting to send ${purpose} OTP to ${to} ...`);
    const subjects = {
      VERIFY: `${process.env.APP_NAME} — Verify your email`,
      RESET: `${process.env.APP_NAME} — Reset your password`,
      ADMIN_MFA: `${process.env.APP_NAME} — Admin MFA Code`,
      LOGIN: `${process.env.APP_NAME} — Driver Login Code`,
    };
    const intros = {
      VERIFY: 'Use the code below to verify your email address.',
      RESET: 'Use the code below to reset your password.',
      ADMIN_MFA: 'Use this code to complete your admin sign-in.',
      LOGIN: 'Use this code to complete your driver sign-in.',
    };

    await this.transporter.sendMail({
      from: `"${process.env.APP_NAME}" <${process.env.SMTP_USER}>`,
      to,
      subject: subjects[purpose],
      html: `
        <div style="font-family:Inter,Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#f5f7f8;border-radius:12px">
          <div style="text-align:center;margin-bottom:24px">
            <span style="font-size:28px;font-weight:900;color:#16a34a">Aegis</span>
          </div>
          <div style="background:#fff;border-radius:10px;padding:28px">
            <p style="color:#334155;margin:0 0 16px">${intros[purpose]}</p>
            <div style="text-align:center;padding:20px;background:#f0f6ff;border-radius:8px;margin:16px 0">
              <span style="font-size:40px;font-weight:900;letter-spacing:12px;color:#0d6cf2">${otp}</span>
            </div>
            <p style="color:#64748b;font-size:13px;margin:16px 0 0">This code expires in <strong>10 minutes</strong>. Do not share it with anyone.</p>
          </div>
          <p style="text-align:center;color:#94a3b8;font-size:12px;margin-top:24px">© ${new Date().getFullYear()} Aegis. All rights reserved.</p>
        </div>
      `,
    });
  }

  async sendClaimApprovedEmail(
    to: string,
    payload: { driverName: string; amount: number; transactionId: string; disruptionType: string },
  ) {
    console.log(`[EmailService] Sending claim approval email to ${to} ...`);

    const subject = `${process.env.APP_NAME} - Claim Approved`;
    const amount = Number(payload.amount || 0).toLocaleString('en-IN');

    await this.transporter.sendMail({
      from: `"${process.env.APP_NAME}" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html: `
        <div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:0 auto;padding:32px;background:#f5f7f8;border-radius:12px">
          <div style="text-align:center;margin-bottom:24px">
            <span style="font-size:28px;font-weight:900;color:#16a34a">Aegis</span>
          </div>
          <div style="background:#fff;border-radius:10px;padding:28px">
            <p style="color:#334155;margin:0 0 12px">Hi ${payload.driverName},</p>
            <p style="color:#334155;margin:0 0 16px">Your AEGIS claim has been approved.</p>
            <div style="padding:16px;background:#f0f6ff;border-radius:8px;margin:16px 0">
              <p style="margin:0 0 8px;color:#1f2937"><strong>Disruption:</strong> ${payload.disruptionType}</p>
              <p style="margin:0 0 8px;color:#1f2937"><strong>Payout:</strong> INR ${amount}</p>
              <p style="margin:0;color:#1f2937"><strong>Reference:</strong> ${payload.transactionId}</p>
            </div>
            <p style="color:#64748b;font-size:13px;margin:16px 0 0">Amount has been transferred to your registered bank account. This email is your proof of transfer.</p>
          </div>
          <p style="text-align:center;color:#94a3b8;font-size:12px;margin-top:24px">© ${new Date().getFullYear()} Aegis. All rights reserved.</p>
        </div>
      `,
    });
  }
}
