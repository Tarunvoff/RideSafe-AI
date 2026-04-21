import { Injectable, Logger } from '@nestjs/common';
import * as twilio from 'twilio';

@Injectable()
export class TwilioService {
  private readonly logger = new Logger(TwilioService.name);
  private readonly client?: twilio.Twilio;

  constructor() {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;

    if (accountSid && authToken) {
      this.client = twilio(accountSid, authToken);
    } else {
      this.logger.warn('Twilio credentials not found in environment variables.');
    }
  }

  getClient(): twilio.Twilio {
    return this.client;
  }

  createMessagingResponse(): twilio.twiml.MessagingResponse {
    return new twilio.twiml.MessagingResponse();
  }

  createVoiceResponse(): twilio.twiml.VoiceResponse {
    return new twilio.twiml.VoiceResponse();
  }

  async sendSms(to: string, body: string) {
    if (!this.client) throw new Error('Twilio client not initialized');
    return this.client.messages.create({
      body,
      from: process.env.TWILIO_PHONE_NUMBER,
      to,
    });
  }

  async sendWhatsApp(to: string, body: string) {
    if (!this.client) throw new Error('Twilio client not initialized');
    const from = process.env.TWILIO_WHATSAPP_NUMBER || '+14155238886'; // Sandbox default
    return this.client.messages.create({
      body,
      from: `whatsapp:${from}`,
      to: `whatsapp:${to}`,
    });
  }
}
