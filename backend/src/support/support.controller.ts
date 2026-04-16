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
        legalNotice:
          'By using Aegis, you consent to collection and controlled sharing of relevant platform activity data with regulated insurer and payout-processing partners for eligibility validation, risk scoring, fraud checks, and automated claim settlement.',
        privacySections: [
          {
            title: 'Platform Activity Data Sharing',
            body:
              'Aegis may process and share only the minimum necessary activity records from linked delivery platforms (for example active shift state, disruption markers, and payout-relevant verification signals) with regulated partners to operate weekly income-loss protection.',
            icon: 'share-social-outline',
          },
          {
            title: 'Financial Data Consent',
            body:
              'Bank or UPI payout details are collected only after explicit consent and are used only for insurance settlement and related compliance controls.',
            icon: 'card-outline',
          },
        ],
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
