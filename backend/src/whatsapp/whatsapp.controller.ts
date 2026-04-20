import { Controller, Post, Body, Res, Header, Logger } from '@nestjs/common';
import { Response } from 'express';
import { AssistantService } from '../assistant/assistant.service';
import { TwilioService } from '../twilio-provider/twilio.service';

@Controller('whatsapp')
export class WhatsappController {
  private readonly logger = new Logger(WhatsappController.name);

  constructor(
    private readonly assistant: AssistantService,
    private readonly twilio: TwilioService
  ) {}

  @Post()
  @Header('Content-Type', 'text/xml')
  async handleWebhook(@Body() body: any, @Res() res: Response) {
    const from = body.From || '';
    const incomingText = body.Body || '';
    
    this.logger.log(`📥 Incoming WhatsApp: ${from} -> ${incomingText}`);
    
    try {
      const reply = await this.assistant.processRequest(incomingText, from, 'whatsapp');
      
      const twiml = this.twilio.createMessagingResponse();
      twiml.message(reply);
      
      res.status(200).send(twiml.toString());
    } catch (error) {
      this.logger.error(`WhatsApp Error: ${error.message}`);
      res.status(200).send('<Response><Message>Shield is temporarily offline. Please try again later.</Message></Response>');
    }
  }

  @Post('send')
  async send(@Body('to') to: string, @Body('message') message: string) {
    return this.twilio.sendWhatsApp(to, message);
  }
}
