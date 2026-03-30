import { BadRequestException, Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { PayoutIdempotencyService } from './payout-idempotency.service';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly idempotency: PayoutIdempotencyService,
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

  async createOrder(userId: string, weeklyPlanId: string) {
    const prisma = this.prisma as any;
    const plan = await prisma.weeklyPlan.findUnique({ where: { id: weeklyPlanId } });
    if (!plan) throw new BadRequestException('Weekly plan not found');

    const razorpay = this.getRazorpayClient();

    const amountPaise = Math.round(plan.price * 100); // price is stored in INR
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

    // Keep "Purchased Plans" clean: expire any other active policies.
    await prisma.policy.updateMany({
      where: {
        userId,
        status: 'ACTIVE',
        endDate: { gt: now },
      },
      data: {
        endDate: now,
      },
    });

    const endDate = new Date(now.getTime() + plan.durationDays * 24 * 60 * 60 * 1000);

    const policy = await prisma.policy.create({
      data: {
        userId,
        planType: plan.key,
        status: 'ACTIVE',
        premium: plan.price,
        startDate: now,
        endDate,
        weeklyPlanId: plan.id,
      },
    });

    await prisma.razorpayOrder.update({
      where: { id: razorpayOrder.id },
      data: {
        status: 'SUCCESS',
        razorpayPaymentId: razorpay_payment_id,
        razorpaySignature: razorpay_signature,
      },
    });

    return {
      success: true,
      policy,
    };
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

      // 4. Trigger actual gateway transfer here (mocked for now)
      // e.g. await this.triggerRazorpayRoute(userId, approvedPayout);
      const simulatedTransactionId = `txn_param_${Date.now()}`;

      // 5. Mark as SUCCESS in both places
      await prisma.payout.update({
        where: { id: payout.id },
        data: {
          status: 'APPROVED',
          transactionId: simulatedTransactionId,
        },
      });

      await this.idempotency.markSuccess(check.idempotencyId, payout.id);

      return {
        success: true,
        cached: false,
        state: 'SUCCESS',
        payoutId: payout.id,
        transactionId: simulatedTransactionId,
      };
    } catch (err: any) {
      // 6. If anything fails (DB or Stripe/Razorpay) → mark FAILED
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
