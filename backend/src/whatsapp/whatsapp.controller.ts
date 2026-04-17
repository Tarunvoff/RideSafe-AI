import { Controller, Post, Body, Res, Header, Logger } from '@nestjs/common';
import { Response } from 'express';
import { WhatsappService } from './whatsapp.service';

@Controller('whatsapp')
export class WhatsappController {
  private readonly logger = new Logger(WhatsappController.name);

  constructor(private readonly whatsappService: WhatsappService) {}

  @Post()
  @Header('Content-Type', 'text/xml')
  async handleWebhook(@Body() body: any, @Res() res: Response) {
    this.logger.log(`📥 Incoming WhatsApp Webhook Request! Body keys: ${Object.keys(body).join(', ')}`);
    try {
      const twiml = await this.whatsappService.processIncomingMessage(body);
      res.status(200).send(twiml);
    } catch (error) {
      this.logger.error(`Error handling WhatsApp webhook: ${error.message}`);
      res.status(500).send('<Response><Message>Internal Server Error</Message></Response>');
    }
  }

  @Post('test-send')
  async testSend(@Body('to') to: string, @Body('message') message: string) {
    return this.whatsappService.sendMessage(to || '9600422401', message || 'Hello from Aegis WhatsApp Bot! 🛡️');
  }
}
