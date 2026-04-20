import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { EmailService } from '../email/email.service';
import { PrismaService } from '../prisma/prisma.service';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

type NotificationChannel = 'SMS' | 'EMAIL' | 'PUSH';
type NotificationType = 'CLAIM_APPROVED' | 'PAYOUT_FAILED' | 'POLICY_ACTIVATED' | 'OTP_AUTH';

interface ClaimApprovedPayload {
  driverName: string;
  amount: number;
  transactionId: string;
  disruptionType: string;
}

interface OtpAuthPayload {
  otp: string;
  purpose?: 'LOGIN' | 'VERIFY' | 'RESET';
}

type KafkaEventMeta = {
  partition?: number;
  offset?: string;
  key?: string;
  headers?: Record<string, string>;
};

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
  ) {}

  private get notificationRepo() {
    return (this.prisma as any).notification;
  }

  private hasNotificationRepo(): boolean {
    return Boolean(this.notificationRepo);
  }

  private template(type: NotificationType, payload: unknown): string {
    if (type === 'CLAIM_APPROVED') {
      const p = payload as ClaimApprovedPayload;
      return `Your claim is approved. INR ${Number(p.amount).toLocaleString('en-IN')} is transferred. Ref: ${p.transactionId}.`;
    }
    if (type === 'PAYOUT_FAILED') {
      return 'We are retrying your payout because of a transient process error. No action required.';
    }
    if (type === 'OTP_AUTH') {
      const p = payload as OtpAuthPayload;
      const purpose = p?.purpose || 'LOGIN';
      return `Your Aegis ${purpose} OTP is ${p.otp}. It expires in 10 minutes. Do not share this code.`;
    }
    return 'Your weekly policy is now active and protected.';
  }

  private parseEnvFile(filePath: string): Record<string, string> {
    const out: Record<string, string> = {};
    const raw = readFileSync(filePath, 'utf8');

    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;

      const body = trimmed.startsWith('export ') ? trimmed.slice(7).trim() : trimmed;
      const idx = body.indexOf('=');
      if (idx <= 0) continue;

      const key = body.slice(0, idx).trim();
      const value = body.slice(idx + 1).trim().replace(/^"|"$/g, '');
      if (key) out[key] = value;
    }

    return out;
  }

  private resolveTwilioCredentials(): { sid?: string; token?: string; from?: string } {
    let sid = process.env.TWILIO_ACCOUNT_SID;
    let token = process.env.TWILIO_AUTH_TOKEN;
    let from = process.env.TWILIO_PHONE_NUMBER;

    if (sid && token && from) {
      return { sid, token, from };
    }

    const envCandidates = [
      join(process.cwd(), '.env'),
      join(process.cwd(), 'backend', '.env'),
      join(__dirname, '..', '..', '.env'),
      join(__dirname, '..', '..', '..', '.env'),
    ];

    for (const envPath of envCandidates) {
      try {
        if (!existsSync(envPath)) continue;
        const parsed = this.parseEnvFile(envPath);

        sid = sid || parsed.TWILIO_ACCOUNT_SID;
        token = token || parsed.TWILIO_AUTH_TOKEN;
        from = from || parsed.TWILIO_PHONE_NUMBER;

        if (sid && token && from) {
          break;
        }
      } catch (e) {
        this.logger.warn(`[TWILIO] Failed reading env file '${envPath}': ${String(e)}`);
      }
    }

    return { sid, token, from };
  }

  private async sendSmsViaTwilio(to: string, message: string): Promise<boolean> {
    const { sid, token, from } = this.resolveTwilioCredentials();

    if (!sid || !token || !from) {
      this.logger.warn(`[TWILIO] Credentials missing; skipping SMS to ${to}. (Message: ${message})`);
      return false;
    }

    try {
      const auth = Buffer.from(`${sid}:${token}`).toString('base64');
      const response = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization: `Basic ${auth}`,
          },
          body: new URLSearchParams({
            To: to,
            From: from,
            Body: message,
          }).toString(),
        },
      );

      if (!response.ok) {
        const error = await response.text();
        this.logger.error(`[TWILIO] SMS delivery failed: ${error}`);
        return false;
      }

      this.logger.log(`[TWILIO] SMS successfully dispatched to ${to}`);
      return true;
    } catch (err) {
      this.logger.error(`[TWILIO] Execution error: ${err}`);
      return false;
    }
  }

  async send(params: {
    channel: NotificationChannel;
    type: NotificationType;
    recipient: string;
    payload: unknown;
    context?: Record<string, unknown>;
  }): Promise<{ ok: boolean; channel: NotificationChannel }> {
    const structuredContext = {
      channel: params.channel,
      type: params.type,
      recipient: params.recipient,
      ...(params.context ?? {}),
    };

    try {
      let dispatched = false;
      const message = this.template(params.type, params.payload);

      if (params.channel === 'EMAIL' && params.type === 'CLAIM_APPROVED') {
        await this.email.sendClaimApprovedEmail(params.recipient, params.payload as ClaimApprovedPayload);
        dispatched = true;
      } else if (params.channel === 'SMS') {
        dispatched = await this.sendSmsViaTwilio(params.recipient, message);
      } 
      
      if (!dispatched) {
        this.logger.log(
          JSON.stringify({
            event: 'notification_logged_only',
            ...structuredContext,
            message,
          }),
        );
      }

      const contextUserId = this.asString(params.context?.user_id) ?? this.asString(params.context?.userId);
      if (contextUserId && this.hasNotificationRepo()) {
        await this.notificationRepo.create({
          data: {
            userId: contextUserId,
            eventType: this.mapNotificationTypeToEventType(params.type),
            message: this.template(params.type, params.payload),
            metadata: {
              channel: params.channel,
              recipient: params.recipient,
              context: params.context ?? null,
            } as any,
            isRead: false,
          },
        }).catch((err: unknown) => {
          const errorMessage = err instanceof Error ? err.message : String(err);
          this.logger.warn(`[notification-send] could not persist in-app notification: ${errorMessage}`);
        });
      }

      return { ok: true, channel: params.channel };
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      this.logger.error(
        JSON.stringify({
          event: 'notification_failed',
          ...structuredContext,
          error: errorMessage,
        }),
      );
      return { ok: false, channel: params.channel };
    }
  }

  private mapNotificationTypeToEventType(type: NotificationType): string {
    if (type === 'CLAIM_APPROVED') return 'PAYOUT_COMPLETED';
    if (type === 'PAYOUT_FAILED') return 'PAYOUT_INITIATED';
    if (type === 'POLICY_ACTIVATED') return 'POLICY_TRIGGERED';
    return 'SYSTEM';
  }

  async sendClaimApproved(email: string, payload: ClaimApprovedPayload) {
    return this.send({
      channel: 'EMAIL',
      type: 'CLAIM_APPROVED',
      recipient: email,
      payload,
      context: { transactionId: payload.transactionId },
    });
  }

  async sendOtpSms(phone: string, otp: string, purpose: 'LOGIN' | 'VERIFY' | 'RESET' = 'LOGIN') {
    return this.send({
      channel: 'SMS',
      type: 'OTP_AUTH',
      recipient: phone,
      payload: { otp, purpose } as OtpAuthPayload,
      context: { purpose },
    });
  }

  async getNotifications(userId: string, params?: { limit?: number; offset?: number }) {
    if (!this.hasNotificationRepo()) {
      this.logger.warn('[notification] Prisma client missing Notification delegate; run prisma generate');
      return [];
    }

    const limit = Math.min(Math.max(params?.limit ?? 20, 1), 100);
    const offset = Math.max(params?.offset ?? 0, 0);

    return this.notificationRepo.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      skip: offset,
      take: limit,
    });
  }

  async markAsRead(userId: string, id: string) {
    if (!this.hasNotificationRepo()) {
      throw new NotFoundException('Notification not found');
    }

    const notification = await this.notificationRepo.findFirst({
      where: { id, userId },
      select: { id: true },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    await this.notificationRepo.update({
      where: { id },
      data: { isRead: true },
    });

    return { id, isRead: true };
  }

  async getUnreadCount(userId: string) {
    if (!this.hasNotificationRepo()) {
      return { unreadCount: 0 };
    }

    const count = await this.notificationRepo.count({
      where: { userId, isRead: false },
    });

    return { unreadCount: count };
  }

  async processKafkaEvent(topic: string, payload: Record<string, unknown>, meta?: KafkaEventMeta) {
    try {
      const eventType = this.inferEventType(topic, payload);
      if (!eventType) {
        return;
      }

      if (!this.hasNotificationRepo()) {
        this.logger.warn('[notification-consumer] Prisma client missing Notification delegate; run prisma generate');
        return;
      }

      const userId = this.extractUserId(payload);
      if (!userId) {
        this.logger.warn(`[notification-consumer] userId missing for eventType=${eventType} topic=${topic}`);
        return;
      }

      const eventId = this.extractEventId(payload, topic, meta);
      if (eventId) {
        const duplicate = await this.notificationRepo.findFirst({
          where: {
            userId,
            eventType,
            metadata: {
              path: ['eventId'],
              equals: eventId,
            },
          },
          select: { id: true },
        });

        if (duplicate) {
          return;
        }
      }

      const message = this.buildMessage(eventType, payload);
      await this.notificationRepo.create({
        data: {
          userId,
          eventType,
          message,
          metadata: {
            topic,
            eventId,
            partition: meta?.partition,
            offset: meta?.offset,
            key: meta?.key,
            payload,
          } as any,
          isRead: false,
        },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`[notification-consumer] failed to process topic=${topic}: ${message}`);
    }
  }

  private extractUserId(payload: Record<string, unknown>): string | null {
    const direct = this.asString(payload.userId)
      ?? this.asString(payload.user_id)
      ?? this.asString(payload.driverId)
      ?? this.asString(payload.driver_id);
    if (direct) return direct;

    const user = payload.user as Record<string, unknown> | undefined;
    if (user) {
      const nested = this.asString(user.id) ?? this.asString(user.userId);
      if (nested) return nested;
    }

    const policy = payload.policy as Record<string, unknown> | undefined;
    if (policy) {
      const fromPolicy = this.asString(policy.userId) ?? this.asString(policy.user_id);
      if (fromPolicy) return fromPolicy;
    }

    return null;
  }

  private extractEventId(
    payload: Record<string, unknown>,
    topic: string,
    meta?: KafkaEventMeta,
  ): string | null {
    const direct = this.asString(payload.eventId)
      ?? this.asString(payload.event_id)
      ?? this.asString(payload.id)
      ?? this.asString(payload.traceId)
      ?? this.asString(payload.trace_id);

    if (direct) return direct;

    if (typeof meta?.partition === 'number' && meta.offset) {
      return `${topic}:${meta.partition}:${meta.offset}`;
    }

    return null;
  }

  private inferEventType(topic: string, payload: Record<string, unknown>): string | null {
    const rawType = this.asString(payload.eventType)
      ?? this.asString(payload.event_type)
      ?? this.asString(payload.type)
      ?? this.asString(payload.event)
      ?? this.asString(payload.action)
      ?? this.asString(payload.status);
    const type = rawType?.toUpperCase();

    if (type?.includes('LOGIN')) return 'USER_LOGIN';
    if (type?.includes('PAYOUT_INITIATED') || type?.includes('PAYOUT_STARTED') || type === 'PROCESSING') {
      return 'PAYOUT_INITIATED';
    }
    if (type?.includes('PAYOUT_COMPLETED') || type?.includes('PAYOUT_APPROVED') || type === 'APPROVED' || type?.includes('SUCCESS')) {
      return 'PAYOUT_COMPLETED';
    }
    if (type?.includes('FRAUD_DETECTED') || type?.includes('FRAUD_ALERT') || type?.includes('SUSPICIOUS')) {
      return 'FRAUD_DETECTED';
    }
    if (type?.includes('POLICY_TRIGGERED') || type?.includes('POLICY_ACTIVATED') || type?.includes('POLICY_ISSUED')) {
      return 'POLICY_TRIGGERED';
    }

    const normalizedTopic = topic.toLowerCase();
    if (normalizedTopic === 'user_events') {
      return 'USER_LOGIN';
    }
    if (normalizedTopic === 'payout_events') {
      const status = (this.asString(payload.status) ?? '').toUpperCase();
      if (status === 'APPROVED' || status === 'COMPLETED' || status === 'SUCCESS') return 'PAYOUT_COMPLETED';
      return 'PAYOUT_INITIATED';
    }
    if (normalizedTopic === 'fraud_events') {
      return 'FRAUD_DETECTED';
    }
    if (normalizedTopic === 'policy_events') {
      return 'POLICY_TRIGGERED';
    }

    return null;
  }

  private buildMessage(eventType: string, payload: Record<string, unknown>): string {
    if (eventType === 'USER_LOGIN') {
      return 'You logged in successfully';
    }

    if (eventType === 'PAYOUT_INITIATED') {
      const amount = this.extractAmount(payload);
      return `Your payout of ${this.formatInr(amount)} has started`;
    }

    if (eventType === 'PAYOUT_COMPLETED') {
      const amount = this.extractAmount(payload);
      return `Your payout of ${this.formatInr(amount)} is completed`;
    }

    if (eventType === 'FRAUD_DETECTED') {
      return 'Suspicious activity detected';
    }

    if (eventType === 'POLICY_TRIGGERED') {
      return 'Insurance policy activated';
    }

    return 'Notification received';
  }

  private extractAmount(payload: Record<string, unknown>): number {
    const amountRaw = payload.amount
      ?? payload.approvedPayout
      ?? payload.approved_payout
      ?? payload.payoutAmount
      ?? payload.payout_amount;

    const amount = Number(amountRaw);
    return Number.isFinite(amount) ? amount : 0;
  }

  private formatInr(amount: number): string {
    return `\u20B9${Number(amount).toLocaleString('en-IN')}`;
  }

  private asString(value: unknown): string | null {
    return typeof value === 'string' && value.trim() ? value : null;
  }
}