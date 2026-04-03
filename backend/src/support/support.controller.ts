import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';

@Controller('support')
export class SupportController {
  @Get('config')
  @HttpCode(HttpStatus.OK)
  getConfig() {
    return {
      message: 'Support config retrieved successfully',
      data: {
        legalFooter: '© 2026 Aegis Platforms. All rights reserved. Registered under standard regulatory frameworks.',
        appVersion: '2.1.0-prod',
        faqs: [
          { id: '1', q: 'How are payouts calculated?', a: 'They are based on dynamic zone-risk premiums and real-time weather data.' },
          { id: '2', q: 'What happens if my KYC fails?', a: 'Your payouts will be suspended until valid documentation is uploaded and verified.' },
        ],
        contacts: {
          email: 'driver-care@aegis.app',
          phone: '+1-800-AEGIS-APP',
          hours: '24/7 Priority Support',
        },
      },
    };
  }
}
