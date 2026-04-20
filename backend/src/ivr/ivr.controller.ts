import { Controller, Post, Body, Res, Header, Logger, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { AssistantService } from '../assistant/assistant.service';
import { TwilioService } from '../twilio-provider/twilio.service';

@Controller('ivr')
export class IvrController {
  private readonly logger = new Logger(IvrController.name);

  constructor(
    private readonly assistant: AssistantService,
    private readonly twilio: TwilioService
  ) {}

  @Post('incoming')
  @Header('Content-Type', 'text/xml')
  async handleIncoming(@Body() body: any, @Res() res: Response) {
    const from = body.From || '';
    this.logger.log(`📞 Incoming Call from: ${from}`);

    const response = this.twilio.createVoiceResponse();
    
    // Greet and Gather digits
    const gather = response.gather({
      numDigits: 1,
      action: '/api/ivr/menu',
      method: 'POST',
      timeout: 5,
    });

    gather.say({ voice: 'alice' }, 
      "Welcome to Aegis Parametric Insurance. " +
      "For claim status, press 1. " +
      "For wallet balance, press 2. " +
      "For trust score, press 3. " +
      "To file a disruption claim, press 4. " +
      "Or stay on the line for more options."
    );

    // Fallback if no input
    response.redirect('/api/ivr/incoming');

    res.status(HttpStatus.OK).send(response.toString());
  }

  @Post('menu')
  @Header('Content-Type', 'text/xml')
  async handleMenu(@Body() body: any, @Res() res: Response) {
    const digits = body.Digits;
    const from = body.From || '';
    this.logger.log(`🔢 IVR Digits: ${from} pressed ${digits}`);

    const twiml = this.twilio.createVoiceResponse();

    if (digits) {
      // Process logic via shared assistant
      const reply = await this.assistant.processRequest(digits, from, 'voice');
      
      // Clean fallback text from emojis for voice
      const voiceText = reply.replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]|\p{Emoji_Presentation}|\p{Emoji}/gu, '');
      
      twiml.say({ voice: 'alice' }, voiceText);
      twiml.pause({ length: 1 });
      twiml.say({ voice: 'alice' }, "Returning to the main menu.");
      twiml.redirect('/api/ivr/incoming');
    } else {
      twiml.say({ voice: 'alice' }, "I didn't receive any input. Goodbye.");
      twiml.hangup();
    }

    res.status(HttpStatus.OK).send(twiml.toString());
  }
}
