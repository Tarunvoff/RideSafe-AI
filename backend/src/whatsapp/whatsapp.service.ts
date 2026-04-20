import { Injectable, Logger } from '@nestjs/common';
import { PlansService } from '../plans/plans.service';
import { PrismaService } from '../prisma/prisma.service';
import * as twilio from 'twilio';
import { GoogleGenerativeAI } from '@google/generative-ai';

@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);
  private readonly twilioClient: twilio.Twilio;
  private readonly genAI: GoogleGenerativeAI;
  private readonly model: any;

  constructor(
    private readonly plansService: PlansService,
    private readonly prisma: PrismaService,
  ) {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const geminiKey = process.env.GEMINI_API_KEY;

    if (accountSid && authToken) {
      this.twilioClient = twilio(accountSid, authToken);
    }

    if (geminiKey) {
      this.genAI = new GoogleGenerativeAI(geminiKey);
      this.model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    }
  }

  private async getGenerativeResponse(prompt: string, userContext?: any): Promise<string> {
    if (!this.genAI) {
      return "I'm sorry, I'm currently in maintenance mode. Please try *PLANS* or *STATUS*.";
    }

    const now = new Date();
    const userName = userContext?.driverName || 'Verified Driver';
    const policy = userContext?.policies?.[0];

    const contextStr = policy
      ? `User has an ACTIVE ${policy.planType} policy expiring ${policy.endDate.toDateString()}.`
      : 'User has no active policy currently.';

    const systemPrompt = `
    ROLE: You are "Aegis Sentinel", the high-precision AI assistant for Aegis Parametric Insurance.
    
    STRICT SCOPE: 
    - Answer ONLY about Aegis Insurance.
    - BE EXTREMELY CONCISE.
    - System Time: ${now.toLocaleString()}
    `;

    // Multi-Model Resilience Chain (using full resource names)
    // Priority confirmed: 2.5-flash successfully handshaked!
    const models = ['models/gemini-2.5-flash', 'models/gemini-2.0-flash', 'models/gemini-1.5-flash', 'models/gemini-pro'];

    for (const modelName of models) {
      try {
        const model = this.genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent([systemPrompt, prompt]);
        const response = await result.response;
        return response.text().trim();
      } catch (error) {
        this.logger.warn(`Model ${modelName} failed: ${error.message}. Retrying next...`);
        continue;
      }
    }

    return "🛡️ *Aegis Status:* AI core connection issue. Please use keywords like *PLANS* for now.";
  }

  async sendMessage(to: string, message: string): Promise<any> {
    const from = process.env.TWILIO_WHATSAPP_NUMBER;
    if (!this.twilioClient) {
      this.logger.error('Twilio client not initialized. Check credentials in .env.');
      return;
    }

    try {
      // Clean the number: remove any non-digit characters except +
      let formattedTo = to.replace(/[^0-9+]/g, '');

      // If it doesn't start with +, detect if it already has the 91 prefix
      if (!formattedTo.startsWith('+')) {
        if (formattedTo.startsWith('91') && formattedTo.length === 12) {
          formattedTo = '+' + formattedTo;
        } else {
          formattedTo = '+91' + formattedTo;
        }
      }

      const response = await this.twilioClient.messages.create({
        from: `whatsapp:${from}`,
        to: `whatsapp:${formattedTo}`,
        body: message,
      });
      this.logger.log(`Message sent to ${to}: ${response.sid}`);
      return response;
    } catch (error) {
      this.logger.error(`Failed to send WhatsApp message to ${to}: ${error.message}`);
      throw error;
    }
  }

  async processIncomingMessage(body: any): Promise<string> {
    const fromRaw = body.From || ''; // Expected: 'whatsapp:+919600422401'
    const incomingText = body.Body?.toLowerCase().trim() || '';
    const authorizedNumber = process.env.AUTHORIZED_TEST_PHONE;

    // 1. Strict Access Control (during sandbox/testing)
    /* if (authorizedNumber) {
      const cleanFrom = fromRaw.replace(/[^0-9]/g, '');
      const cleanAuth = authorizedNumber.replace(/[^0-9]/g, '');

      if (!cleanFrom.includes(cleanAuth)) {
        this.logger.warn(`Unauthorized access attempt from ${fromRaw}. Bot is locked to ${authorizedNumber}.`);
        return '';
      }
    } */

    // 2. Identify User & Context
    const phoneNumber = fromRaw.replace('whatsapp:', ''); // Result: '+919600422401'
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [
          { phone: phoneNumber },
          { phone: phoneNumber.replace('+', '') },
          { phone: phoneNumber.slice(-10) } // Match last 10 digits as fallback
        ]
      },
      include: {
        policies: {
          where: { status: 'ACTIVE' },
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    });

    this.logger.log(`Received WhatsApp message from ${phoneNumber}: ${incomingText}`);
    const response = new twilio.twiml.MessagingResponse();

    // 3. Command Routing
    if (incomingText.includes('plan')) {
      const plans = await this.plansService.getWeeklyPlans(user?.id || phoneNumber);
      const planList = plans
        .map((p) => `*${p.name}*\nPrice: ₹${p.price}\nMax Payout: ₹${p.maxPayout}\n${p.reason}`)
        .join('\n\n');

      response.message(`🛡️ *Aegis Available Plans*\n\n${planList}\n\nReply with 'HI' to see more options.`);
    }
    else if (incomingText === 'hi' || incomingText === 'hello' || incomingText === 'start') {
      const greeting = user?.driverName ? `👋 *Hello ${user.driverName}!*` : `👋 *Hello from Aegis!*`;
      response.message(
        `${greeting} Welcome to your parametric insurance shield.\n\nTry these commands:\n- *PLANS*: See available insurance plans\n- *STATUS*: Check your active policy & payouts\n- *HELP*: Get assistance`,
      );
    }
    else if (incomingText === 'status') {
      if (!user) {
        response.message(`📜 *Policy Status*\nYou currently have no account linked to this number. Visit the Aegis dashboard to secure your earnings!`);
      } else {
        const activePolicy = user.policies[0];
        if (!activePolicy) {
          response.message(`📜 *Status Update*\nHey ${user.driverName || 'there'}, you don't have an active policy. Protect your income today by replying *PLANS*!`);
        } else {
          // Fetch latest payout for this policy
          const latestPayout = await this.prisma.payout.findFirst({
            where: { policyId: activePolicy.id },
            include: { disruptionEvent: true },
            orderBy: { createdAt: 'desc' }
          });

          let statusMsg = `📜 *Your Policy: ${activePolicy.planType}*\nStatus: ✅ ACTIVE\nExpires: ${activePolicy.endDate.toDateString()}\n\n`;

          if (latestPayout) {
            statusMsg += `🔔 *Latest Claim*\nType: ${latestPayout.disruptionEvent?.type || 'Disruption'}\nStatus: ${latestPayout.status}\nAmount: ₹${latestPayout.approvedPayout}\nRef: ${latestPayout.transactionId || 'Pending'}`;
          } else {
            statusMsg += `✅ No disruptions detected in your zone. You are protected!`;
          }

          response.message(statusMsg);
        }
      }
    }
    else if (incomingText === 'help') {
      response.message(`🆘 *Aegis Help*\n\nI can help you with:\n1. Checking coverage (*PLANS*)\n2. Policy & Payout status (*STATUS*)\n3. Contacting human support (*SUPPORT*)`);
    }
    else {
      const aiResponse = await this.getGenerativeResponse(body.Body || '', user);
      response.message(aiResponse);
    }

    return response.toString();
  }
}
