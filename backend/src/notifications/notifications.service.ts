import { Injectable, Logger } from '@nestjs/common';
import { EmailService } from '../email/email.service';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly email: EmailService) {}

  async sendClaimApproved(
    email: string,
    payload: { driverName: string; amount: number; transactionId: string; disruptionType: string },
  ) {
    try {
      await this.email.sendClaimApprovedEmail(email, payload);
      this.logger.log(`Claim approval email sent to ${email} - ${payload.transactionId}`);
    } catch (err: any) {
      this.logger.warn(`Claim approval email failed for ${email}: ${err?.message ?? err}`);
    }
  }
}
