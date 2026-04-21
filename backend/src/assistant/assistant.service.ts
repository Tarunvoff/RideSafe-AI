import { Injectable, Logger } from '@nestjs/common';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { UsersService } from '../users/users.service';
import { ClaimsService } from '../claims/claims.service';
import { WalletService } from '../wallet/wallet.service';
import { TrustScoreService } from '../trust-score/trust-score.service';
import { PlansService } from '../plans/plans.service';

@Injectable()
export class AssistantService {
  private readonly logger = new Logger(AssistantService.name);
  private readonly genAI?: GoogleGenerativeAI;

  constructor(
    private readonly users: UsersService,
    private readonly claims: ClaimsService,
    private readonly wallet: WalletService,
    private readonly trustScore: TrustScoreService,
    private readonly plans: PlansService,
  ) {
    const key = process.env.GEMINI_API_KEY;
    if (key) {
      this.genAI = new GoogleGenerativeAI(key);
    }
  }

  async processRequest(input: string, from: string, channel: 'whatsapp' | 'voice') {
    const user = await this.users.findByPhone(from);
    const text = input.trim().toUpperCase();

    // 1. Keyword Detection
    if (text === 'STATUS' || text === '1') {
      return this.handleStatus(user);
    }
    if (text === 'WALLET' || text === 'EARNINGS' || text === '2') {
      return this.handleWallet(user);
    }
    if (text === 'TRUST' || text === 'SCORE' || text === '3') {
      return this.handleTrust(user);
    }
    if (text === 'PAY' || text === 'CLAIM' || text === 'FILE' || text === '4') {
      return this.handleClaim(user);
    }
    if (text === 'HI' || text === 'HELLO' || text === 'START' || text === 'HELP') {
        return this.handleHelp(user, channel);
    }
    if (text === 'PLANS' || text === 'QUOTE') {
        return this.handlePlans(user);
    }

    // 2. Gemini Fallback
    return this.handleGeminiFallback(input, user, channel);
  }

  private async handleStatus(user: any) {
    if (!user) return "I couldn't find an account linked to this number. Please register on the Aegis App.";
    const status = await this.claims.getLatestStatus(user.id);
    if (!status) return `Hello ${user.driverName || 'there'}, your policy is active but no recent claims were found. You are protected!`;
    return `📜 *Latest Claim Status*\nEvent: ${status.event}\nStatus: ${status.status}\nAmount: ₹${status.amount}\nRef: ${status.ref}`;
  }

  private async handleWallet(user: any) {
    if (!user) return "Please link your phone number in the app to check your wallet.";
    const earnings = await this.wallet.getEarnings(user.id);
    return `💰 *Your Wallet*\nBalance: ₹${earnings.balance}\nPending: ₹${earnings.pending}\nTotal Protected: ₹${earnings.balance + earnings.pending}`;
  }

  private async handleTrust(user: any) {
    if (!user) return "Your trust score will be calculated once you start your first policy.";
    const score = await this.trustScore.getScore(user.id);
    return `🛡️ *Trust Score: ${score.score}/100*\nLevel: ${score.level}\nAdvice: ${score.advice}`;
  }

  private async handleClaim(user: any) {
    if (!user) return "Account registration required to file claims.";
    return await this.claims.fileClaim(user.id);
  }

  private async handlePlans(user: any) {
    const plans = await this.plans.getWeeklyPlans(user?.id || 'guest');
    const planList = plans
      .map((p) => `*${p.name}*\nPrice: ₹${p.price}\nMax Payout: ₹${p.maxPayout}\n${p.reason}`)
      .join('\n\n');

    return `🛡️ *Aegis Available Plans*\n\n${planList}\n\nReply with 'HI' to see more options.`;
  }

  private handleHelp(user: any, channel: 'whatsapp' | 'voice') {
      const name = user?.driverName ? `, ${user.driverName}` : '';
      if (channel === 'whatsapp') {
          return `Welcome to Aegis Assistant${name}!\n\nTry these keywords:\n- *STATUS*: Claim status\n- *WALLET*: Earnings\n- *TRUST*: Trust score\n- *FILE*: File a claim\n- *PLANS*: See insurance plans`;
      } else {
          return `Hello${name}, welcome to Aegis. Press 1 for status, 2 for wallet, 3 for trust score, or 4 to file a claim.`;
      }
  }

  private async handleGeminiFallback(input: string, user: any, channel: 'whatsapp' | 'voice') {
    if (!this.genAI) return "I'm sorry, I couldn't process that right now. Please try using keywords like STATUS or WALLET.";

    const model = this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    const systemPrompt = `
      You are Aegis Sentinel, an insurance assistant.
      User Context: ${user ? `Name: ${user.driverName}, Active Policy: ${user.policies[0]?.planType}` : 'Guest User'}.
      Channel: ${channel}.
      Keep responses EXTREMELY concise. Suggest keywords if appropriate.
    `;

    try {
      const result = await model.generateContent([systemPrompt, input]);
      return result.response.text().trim();
    } catch (error) {
      this.logger.error(`Gemini failed: ${error.message}`);
      return "I'm having trouble understanding that. Try sending *STATUS* or *WALLET*.";
    }
  }
}
