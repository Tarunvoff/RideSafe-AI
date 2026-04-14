import { Injectable, Logger } from '@nestjs/common';
import { EmailService } from '../email/email.service';

type NotificationChannel = 'SMS' | 'EMAIL' | 'PUSH';
type NotificationType = 'CLAIM_APPROVED' | 'PAYOUT_FAILED' | 'POLICY_ACTIVATED';

interface ClaimApprovedPayload {
  driverName: string;
  amount: number;
  transactionId: string;
  disruptionType: string;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly email: EmailService) {}

  private template(type: NotificationType, payload: unknown): string {
    if (type === 'CLAIM_APPROVED') {
      const p = payload as unknown as ClaimApprovedPayload;
      return `Your claim is approved. INR ${Number(p.amount).toLocaleString('en-IN')} is transferred. Ref: ${p.transactionId}.`;
    }
    if (type === 'PAYOUT_FAILED') {
      return 'We are retrying your payout because of a temporary processing issue.';
    }
    return 'Your weekly policy is now active and protected.';
  }

  /**
   * Sends notifications via EMAIL/SMS/PUSH with graceful fallback logging.
   */
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
      if (params.channel === 'EMAIL' && params.type === 'CLAIM_APPROVED') {
        await this.email.sendClaimApprovedEmail(params.recipient, params.payload as unknown as ClaimApprovedPayload);
      } else {
        // SMS/PUSH providers are optional in hackathon deployment; preserve structured event logging.
        this.logger.log(
          JSON.stringify({
            event: 'notification_dispatched',
            ...structuredContext,
            message: this.template(params.type, params.payload),
          }),
        );
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

  /**
   * Backward-compatible claim-approved helper used by payout flow.
   */
  async sendClaimApproved(
    email: string,
    payload: ClaimApprovedPayload,
  ) {
    return this.send({
      channel: 'EMAIL',
      type: 'CLAIM_APPROVED',
      recipient: email,
      payload,
      context: { transactionId: payload.transactionId },
    });
  }
}
