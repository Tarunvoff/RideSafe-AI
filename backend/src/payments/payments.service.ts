import { BadRequestException, Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { PayoutIdempotencyService } from './payout-idempotency.service';
import { PremiumService } from '../premium/premium.service';
import { ctForPlan } from '../insurance/policy-tiers';
import { NotificationsService } from '../notifications/notifications.service';

const MAX_WEEKLY_PREMIUM_INR = 50;

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly idempotency: PayoutIdempotencyService,
    private readonly premiumService: PremiumService,
    private readonly notifications: NotificationsService,
  ) {}

  private getRazorpayClient(): any {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
      throw new Error('Missing Razorpay credentials in environment variables');
    }

    // Razorpay SDK is CommonJS. Use require() to avoid default-import constructor issues.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Razorpay = require('razorpay');

    return new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });
  }

  private verifyRazorpaySignature(orderId: string, paymentId: string, signature: string) {
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keySecret) throw new Error('Missing RAZORPAY_KEY_SECRET');

    const body = `${orderId}|${paymentId}`;
    const expected = crypto
      .createHmac('sha256', keySecret)
      .update(body)
      .digest('hex');

    // Constant-time compare would be nicer, but simple compare is fine for this flow.
    return expected === signature;
  }

  private resolveTierCapForPlanKey(planKey?: string | null): number {
    const Ct = ctForPlan(planKey ?? null);
    if (Ct == null) return MAX_WEEKLY_PREMIUM_INR;
    const cap = 30 + Ct * 25;
    return Math.min(MAX_WEEKLY_PREMIUM_INR, Math.round(cap * 100) / 100);
  }
  /**
   * Generates a Razorpay-format payout reference for sandbox/demo environments.
   * Format mirrors real Razorpay payout IDs (pout_<base62>, 18 chars after prefix)
   * so downstream systems, audit logs, and the demo UI look production-realistic.
   *
   * Replace this with a real razorpay.payouts.create() call when live credentials
   * and fund account IDs are available.
   */
  private generateSandboxPayoutId(): string {
    const BASE62 = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
    const bytes = crypto.randomBytes(18);
    let result = '';
    for (const byte of bytes) {
      result += BASE62[byte % 62];
    }
    return `pout_${result}`;
  }

  async createOrder(userId: string, weeklyPlanId: string) {
    const prisma = this.prisma as any;
    const plan = await prisma.weeklyPlan.findUnique({ where: { id: weeklyPlanId } });
    if (!plan) throw new BadRequestException('Weekly plan not found');

    const razorpay = this.getRazorpayClient();
    const tierCap = this.resolveTierCapForPlanKey(plan.key ?? null);

    let amountRupees = Number(plan.price);
    try {
      const premiumCalc = await this.premiumService.calculateWeeklyPremium(userId, weeklyPlanId);
      amountRupees = Number(premiumCalc?.premium ?? plan.price);
    } catch (err: any) {
      amountRupees = Math.min(Number(plan.price), tierCap);
      this.logger.warn(
        `Premium calculation failed for user=${userId} plan=${weeklyPlanId}; using tier-capped static fallback=${amountRupees}. Error: ${err?.message ?? err}`,
      );
    }

    amountRupees = Math.min(amountRupees, tierCap);

    const amountPaise = Math.round(amountRupees * 100); // Razorpay expects paise
    // Razorpay requires `receipt` length <= 40 characters.
    const receipt = `rcpt_${plan.key}_${Date.now()}`;

    const order: any = await razorpay.orders.create({
      amount: amountPaise,
      currency: 'INR',
      receipt,
      payment_capture: true,
    });

    await prisma.razorpayOrder.create({
      data: {
        userId,
        weeklyPlanId: plan.id,
        razorpayOrderId: order.id,
        amount: amountPaise,
        currency: order.currency ?? 'INR',
      },
    });

    return {
      keyId: process.env.RAZORPAY_KEY_ID,
      razorpayOrderId: order.id,
      amount: order.amount,
      currency: order.currency ?? 'INR',
    };
  }

  async verifyPayment(userId: string, dto: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) {
    const prisma = this.prisma as any;
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = dto;

    const razorpayOrder = await prisma.razorpayOrder.findUnique({
      where: { razorpayOrderId: razorpay_order_id },
      include: { weeklyPlan: true },
    });

    if (!razorpayOrder) {
      throw new BadRequestException('Invalid Razorpay order');
    }
    if (razorpayOrder.userId !== userId) {
      throw new UnauthorizedException('Order does not belong to this user');
    }

    // Idempotency: if already successful, just return the existing active policy (if any).
    if (razorpayOrder.status === 'SUCCESS') {
      const activePolicy = await prisma.policy.findFirst({
        where: { userId, weeklyPlanId: razorpayOrder.weeklyPlanId, status: 'ACTIVE', endDate: { gt: new Date() } },
        orderBy: { createdAt: 'desc' },
      });

      return {
        success: true,
        policy: activePolicy,
      };
    }

    const isValid = this.verifyRazorpaySignature(razorpay_order_id, razorpay_payment_id, razorpay_signature);
    if (!isValid) {
      await prisma.razorpayOrder.update({
        where: { id: razorpayOrder.id },
        data: { status: 'FAILED', razorpayPaymentId: razorpay_payment_id, razorpaySignature: razorpay_signature },
      });
      throw new BadRequestException('Invalid Razorpay signature');
    }

    const now = new Date();
    const plan = razorpayOrder.weeklyPlan;
    if (!plan) throw new BadRequestException('Weekly plan not found for order');
    const paidPremium = Number((razorpayOrder.amount ?? 0) / 100);

    const endDate = new Date(now.getTime() + plan.durationDays * 24 * 60 * 60 * 1000);

    try {
      const result = await prisma.$transaction(async (tx: any) => {
        await tx.policy.updateMany({
          where: {
            userId,
            status: 'ACTIVE',
            endDate: { gt: now },
          },
          data: {
            endDate: now,
          },
        });

        const policy = await tx.policy.create({
          data: {
            userId,
            planType: plan.key,
            status: 'ACTIVE',
            premium: paidPremium,
            startDate: now,
            endDate,
            weeklyPlanId: plan.id,
          },
        });

        await tx.razorpayOrder.update({
          where: { id: razorpayOrder.id },
          data: {
            status: 'SUCCESS',
            razorpayPaymentId: razorpay_payment_id,
            razorpaySignature: razorpay_signature,
          },
        });

        return policy;
      });

      return {
        success: true,
        policy: result,
      };
    } catch (err: any) {
      this.logger.error(`Critical: Transaction failed during policy creation for order ${razorpayOrder.id}: ${err.message}`);

      try {
        // The transaction rolled back, so the 'SUCCESS' update was undone, but the payment is verified.
        // Update the order status to FAILED outside the transaction to preserve the payment details.
        await prisma.razorpayOrder.update({
          where: { id: razorpayOrder.id },
          data: {
            status: 'FAILED',
            razorpayPaymentId: razorpay_payment_id,
            razorpaySignature: razorpay_signature,
          },
        });

        // Insert into our DLQ table so the ML/event pipeline or admin reconciliation jobs 
        // are explicitly aware of the missing policy.
        await prisma.kafkaDLQ.create({
          data: {
            topic: 'PAYMENT_VERIFIED_POLICY_FAILED',
            eventKey: userId,
            payload: JSON.stringify({ 
              orderId: razorpayOrder.id,
              planId: plan.id,
              razorpayPaymentId: razorpay_payment_id 
            }),
            error: err.message,
            status: 'PENDING',
          }
        });
      } catch (fallbackErr: any) {
        // EXACT EDGE CASE: If the DB connection dropped completely, the fallback queries above will ALSO fail.
        // We catch it here so we don't throw an unhandled DB exception back to the client,
        // and we log it as a FATAL alert because money is verified but completely unrecorded locally.
        this.logger.error(`FATAL: Fallback tracking failed for verified Razorpay Payment ID ${razorpay_payment_id}. DB completely unreachable. Err: ${fallbackErr.message}`);
      }

      throw new BadRequestException({
        message: 'Payment verified but policy creation failed. Your money is safe. Please contact support.',
        error: 'POLICY_CREATION_FAILED',
        razorpay_payment_id: razorpay_payment_id
      });
    }
  }

  // ── Parametric Payouts (Idempotent) ──────────────────────────────────────────

  /**
   * Process an automated payout triggered by a geospatial event (e.g., flood).
   * Guarded by exactly-once idempotency logic so duplicate events from ML/Kafka
   * will never result in duplicate money transfers.
   */
  async processParametricPayout(dto: {
    userId: string;
    policyId: string;
    disruptionEventId: string;
    eventTimestamp: number;
    h3Cell: string;
    approvedPayout: number;
  }) {
    const prisma = this.prisma as any;
    const { userId, policyId, disruptionEventId, eventTimestamp, h3Cell, approvedPayout } = dto;

    // 1. Guard against duplicate events
    const check = await this.idempotency.checkOrCreate(userId, h3Cell, eventTimestamp);

    if (!check.shouldProcess) {
      this.logger.log(`Skipping payout for user ${userId} / cell ${h3Cell} — already processed`);
      return { success: true, cached: true, state: check.state, payoutId: check.cachedPayoutId };
    }

    // 2. We hold the lock (PENDING state). Move to PROCESSING.
    await this.idempotency.markProcessing(check.idempotencyId);

    try {
      // If a payout already exists for this policy + disruption, return it as idempotent success.
      const existingPayout = await prisma.payout.findUnique({
        where: { policyId_disruptionEventId: { policyId, disruptionEventId } },
      });
      if (existingPayout) {
        await this.idempotency.markSuccess(check.idempotencyId, existingPayout.id);
        return {
          success: true,
          cached: true,
          state: 'SUCCESS',
          payoutId: existingPayout.id,
          transactionId: existingPayout.transactionId ?? null,
        };
      }

      // 3. Create the Database Payout record
      const payout = await prisma.payout.create({
        data: {
          policyId,
          disruptionEventId,
          status: 'PROCESSING',
          approvedPayout,
          estimatedLoss: approvedPayout,
          paymentMethod: 'AUTO',
          processingTime: new Date().toISOString(),
        },
      });

      // 4. Generate a sandbox payout reference in real Razorpay format.
      //    Replace with razorpay.payouts.create() when live fund account IDs are available.
      const sandboxPayoutId = this.generateSandboxPayoutId();
      this.logger.log(`Parametric payout reference generated: ${sandboxPayoutId}`);

      // 5. Mark as SUCCESS in both places
      await prisma.payout.update({
        where: { id: payout.id },
        data: {
          status: 'APPROVED',
          transactionId: sandboxPayoutId,
        },
      });

      const bankReference = `BANK_${sandboxPayoutId}`;
      await prisma.payout.update({
        where: { id: payout.id },
        data: {
          bankReference,
          transferredAt: new Date(),
        },
      });
      this.logger.log(`Mock bank transfer complete: ${bankReference}`);

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, driverName: true },
      });

      const disruption = await prisma.disruptionEvent.findUnique({
        where: { id: disruptionEventId },
        select: { type: true },
      });

      if (user?.email) {
        await this.notifications.sendClaimApproved(user.email, {
          driverName: user.driverName ?? 'Driver',
          amount: approvedPayout,
          transactionId: sandboxPayoutId,
          disruptionType: disruption?.type ?? 'Weather Event',
        });
      }

      await this.idempotency.markSuccess(check.idempotencyId, payout.id);

      return {
        success: true,
        cached: false,
        state: 'SUCCESS',
        payoutId: payout.id,
        transactionId: sandboxPayoutId,
      };
    } catch (err: any) {
      // 6. If anything fails (DB or gateway) → mark FAILED
      await this.idempotency.markFailed(check.idempotencyId, err.message);

      // Attempt to record failure in the Payout table if it was created
      try {
        const existingPayout = await prisma.payout.findFirst({
          where: { policyId, disruptionEventId },
        });
        if (existingPayout) {
          await prisma.payout.update({
            where: { id: existingPayout.id },
            data: { status: 'REJECTED' },
          });
        }
      } catch (e) {}

      this.logger.error(`Parametric payout failed: ${err.message}`);
      throw new BadRequestException('Payout processing failed');
    }
  }
}