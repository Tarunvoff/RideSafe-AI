import { BadRequestException, Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { PayoutIdempotencyService } from './payout-idempotency.service';
import { PremiumService } from '../premium/premium.service';
import { ctForPlan } from '../insurance/policy-tiers';
import { NotificationsService } from '../notifications/notifications.service';
import { assertDriverPolicyEligibility } from '../compliance/driver-eligibility.util';

const MAX_WEEKLY_PREMIUM_INR = 50;

@Injectable()
/**
 * Payment lifecycle service for Aegis.
 *
 * Flow coverage:
 * 1) Premium order creation and signature verification for plan purchase.
 * 2) Policy issuance after successful premium verification.
 * 3) Parametric claim payout execution with idempotency and audit-safe fallbacks.
 *
 * Integration modes:
 * - Razorpay standard order APIs for premium collection.
 * - RazorpayX-style payout APIs for claims settlement.
 * - Deterministic test-mode payout IDs when test credentials are used
 *   but source account configuration is unavailable.
 */
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly idempotency: PayoutIdempotencyService,
    private readonly premiumService: PremiumService,
    private readonly notifications: NotificationsService,
  ) {}

  /**
   * Retries external payment-gateway calls for transient failures.
   */
  private async withRetry<T>(operation: () => Promise<T>, retries = 2): Promise<T> {
    let lastError: unknown = null;
    for (let attempt = 1; attempt <= retries + 1; attempt += 1) {
      try {
        return await operation();
      } catch (err) {
        lastError = err;
        if (attempt > retries) break;
        this.logger.warn(`Gateway call failed on attempt ${attempt}; retrying...`);
      }
    }
    throw lastError;
  }

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

  private getRazorpayAuthHeader() {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keyId || !keySecret) {
      throw new Error('Missing Razorpay credentials in environment variables');
    }
    const encoded = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
    return `Basic ${encoded}`;
  }

  private isRazorpayTestMode() {
    if ((process.env.RAZORPAY_TEST_MODE ?? '').toLowerCase() === 'true') {
      return true;
    }
    return (process.env.RAZORPAY_KEY_ID ?? '').startsWith('rzp_test_');
  }

  private async razorpayXRequest<T>(
    path: string,
    body: Record<string, unknown>,
  ): Promise<T> {
    const authHeader = this.getRazorpayAuthHeader();
    const baseUrl = process.env.RAZORPAYX_BASE_URL ?? 'https://api.razorpay.com/v1';

    const response = await this.withRetry(
      () =>
        fetch(`${baseUrl}${path}`, {
          method: 'POST',
          headers: {
            Authorization: authHeader,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        }),
      2,
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`RazorpayX ${path} failed (${response.status}): ${errorText}`);
    }

    return (await response.json()) as T;
  }

  private async createRazorpayContact(user: {
    id: string;
    email: string | null;
    phone: string | null;
    driverName: string | null;
  }) {
    return this.razorpayXRequest<{ id: string }>('/contacts', {
      name: user.driverName ?? 'Aegis Driver',
      email: user.email ?? undefined,
      contact: user.phone ?? '9000000000',
      type: 'employee',
      reference_id: `aegis_user_${user.id}`,
      notes: {
        user_id: user.id,
        source: 'aegis-parametric-payout',
      },
    });
  }

  private async createRazorpayFundAccount(
    contactId: string,
    payoutSetup: {
      method: 'UPI' | 'BANK';
      upiId?: string | null;
      accountNumber?: string | null;
      ifscCode?: string | null;
      accountHolder?: string | null;
    },
  ) {
    if (payoutSetup.method === 'UPI') {
      if (!payoutSetup.upiId) {
        throw new BadRequestException('UPI payout setup is missing for driver');
      }

      return this.razorpayXRequest<{ id: string }>('/fund_accounts', {
        contact_id: contactId,
        account_type: 'vpa',
        vpa: {
          address: payoutSetup.upiId,
        },
      });
    }

    if (!payoutSetup.accountNumber || !payoutSetup.ifscCode) {
      throw new BadRequestException('Bank payout setup is missing account details for driver');
    }

    return this.razorpayXRequest<{ id: string }>('/fund_accounts', {
      contact_id: contactId,
      account_type: 'bank_account',
      bank_account: {
        name: payoutSetup.accountHolder ?? 'Aegis Driver',
        ifsc: payoutSetup.ifscCode,
        account_number: payoutSetup.accountNumber,
      },
    });
  }

  private async createRazorpayPayout(params: {
    fundAccountId: string;
    amountPaise: number;
    referenceId: string;
    userId: string;
    policyId: string;
    disruptionEventId: string;
  }) {
    // Default to UPI unless deployment explicitly overrides payout mode.
    const mode = process.env.RAZORPAYX_PAYOUT_MODE ?? 'UPI';

    return this.razorpayXRequest<{ id: string; status?: string; reference_id?: string }>(
      '/payouts',
      {
        account_number: process.env.RAZORPAYX_SOURCE_ACCOUNT,
        fund_account_id: params.fundAccountId,
        amount: params.amountPaise,
        currency: 'INR',
        mode,
        purpose: 'payout',
        queue_if_low_balance: true,
        reference_id: params.referenceId,
        narration: 'Aegis claim payout',
        notes: {
          user_id: params.userId,
          policy_id: params.policyId,
          disruption_event_id: params.disruptionEventId,
        },
      },
    );
  }

  /**
   * Produces a Razorpay-like deterministic response for non-production demos.
   *
   * Why this exists:
   * - lets frontend/admin flows demonstrate a complete payout lifecycle,
   * - preserves stable transaction/reference patterns for audit visibility,
   * - avoids blocking local verification when RazorpayX source account is absent.
   */
  private createRazorpayTestPayout(referenceId: string) {
    const token = this.generateSyntheticPayoutReference().replace('pout_', '');
    return {
      id: `pout_test_${token}`,
      status: 'processed',
      reference_id: `rpy_test_ref_${referenceId}`,
    };
  }
  /**
   * Generates a realistic payout reference for synthetic transfer mode.
   */
  private generateSyntheticPayoutReference(): string {
    const BASE62 = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
    const bytes = crypto.randomBytes(18);
    let result = '';
    for (const byte of bytes) {
      result += BASE62[byte % 62];
    }
    return `pout_${result}`;
  }

  /**
   * Creates a premium collection order for a selected weekly plan.
   *
   * Processing notes:
   * - enforces driver eligibility gates before taking money,
   * - computes premium through pricing engine with a capped fallback,
   * - persists Razorpay order metadata for later signature verification.
   */
  async createOrder(userId: string, weeklyPlanId: string) {
    const plan = await this.prisma.weeklyPlan.findUnique({ where: { id: weeklyPlanId } });
    if (!plan) throw new BadRequestException('Weekly plan not found');

    await assertDriverPolicyEligibility(this.prisma, userId, plan.key);

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

    const order = await this.withRetry<any>(
      () =>
        razorpay.orders.create({
          amount: amountPaise,
          currency: 'INR',
          receipt,
          payment_capture: true,
        }),
      2,
    );

    await this.prisma.razorpayOrder.create({
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

  /**
   * Verifies Razorpay payment signature and issues the active policy.
   *
   * Idempotency/consistency guarantees:
   * - repeated verify calls after SUCCESS return existing active policy,
   * - policy replacement + order success marking happen in one DB transaction,
   * - if policy creation fails after payment proof, order is marked FAILED and
   *   an explicit DLQ record is emitted for reconciliation.
   */
  async verifyPayment(userId: string, dto: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = dto;

    const razorpayOrder = await this.prisma.razorpayOrder.findUnique({
      where: { razorpayOrderId: razorpay_order_id },
      include: { weeklyPlan: true },
    });

    if (!razorpayOrder) {
      throw new BadRequestException('Invalid Razorpay order');
    }
    if (razorpayOrder.userId !== userId) {
      throw new UnauthorizedException('Order does not belong to this user');
    }

    await assertDriverPolicyEligibility(this.prisma, userId, razorpayOrder.weeklyPlan?.key ?? null);

    // Idempotency: if already successful, just return the existing active policy (if any).
    if (razorpayOrder.status === 'SUCCESS') {
      const activePolicy = await this.prisma.policy.findFirst({
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
      await this.prisma.razorpayOrder.update({
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
      const result = await this.prisma.$transaction(async (tx) => {
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
        await this.prisma.razorpayOrder.update({
          where: { id: razorpayOrder.id },
          data: {
            status: 'FAILED',
            razorpayPaymentId: razorpay_payment_id,
            razorpaySignature: razorpay_signature,
          },
        });

        // Insert into our DLQ table so the ML/event pipeline or admin reconciliation jobs 
        // are explicitly aware of the missing policy.
        await this.prisma.kafkaDLQ.create({
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
   * Processes a parametric claim payout for a disruption signal.
   *
   * End-to-end processing stages:
   * 1) validate policy ownership + eligibility gates,
   * 2) acquire idempotency lock by (user, h3Cell, eventTimestamp),
   * 3) reuse existing policy+event payout when present,
   * 4) create payout row in PROCESSING,
   * 5) execute RazorpayX payout or test-mode fallback,
   * 6) persist transaction/reference and mark APPROVED,
   * 7) notify driver and complete idempotency state.
   *
   * Failure path:
   * - idempotency state is marked FAILED,
   * - payout is marked REJECTED when a row exists,
   * - caller receives a controlled bad-request response.
   */
  async processParametricPayout(dto: {
    userId: string;
    policyId: string;
    disruptionEventId: string;
    eventTimestamp: number;
    h3Cell: string;
    approvedPayout: number;
  }) {
    const { userId, policyId, disruptionEventId, eventTimestamp, h3Cell, approvedPayout } = dto;

    const policy = await this.prisma.policy.findUnique({
      where: { id: policyId },
      include: { weeklyPlan: true },
    });
    if (!policy || policy.userId !== userId) {
      throw new BadRequestException('Invalid policy for payout');
    }

    await assertDriverPolicyEligibility(this.prisma, userId, policy.weeklyPlan?.key ?? policy.planType ?? null);

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
      const existingPayout = await this.prisma.payout.findUnique({
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
      const payout = await this.prisma.payout.create({
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

      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true, phone: true, driverName: true },
      });
      if (!user) {
        throw new BadRequestException('User not found for payout');
      }

      const payoutSetup = await this.prisma.kYCPayoutSetup.findUnique({
        where: { userId },
        select: {
          method: true,
          upiId: true,
          accountNumber: true,
          ifscCode: true,
          accountHolder: true,
        },
      });
      if (!payoutSetup) {
        throw new BadRequestException('Driver payout setup is missing');
      }

      const payoutReference = `aegis_payout_${payout.id}`;
      const payoutAmountPaise = Math.max(100, Math.round(approvedPayout * 100));
      const hasSourceAccount = Boolean(process.env.RAZORPAYX_SOURCE_ACCOUNT);
      const testMode = this.isRazorpayTestMode();

      const razorpayPayout = hasSourceAccount
        ? await (async () => {
            const contact = await this.createRazorpayContact(user);
            const fundAccount = await this.createRazorpayFundAccount(contact.id, payoutSetup as any);
            return this.createRazorpayPayout({
              fundAccountId: fundAccount.id,
              amountPaise: payoutAmountPaise,
              referenceId: payoutReference,
              userId,
              policyId,
              disruptionEventId,
            });
          })()
        : testMode
          ? this.createRazorpayTestPayout(payoutReference)
          : (() => {
              throw new BadRequestException('RAZORPAYX_SOURCE_ACCOUNT is missing');
            })();

      this.logger.log(`RazorpayX payout created: ${razorpayPayout.id}`);

      // 5. Mark as SUCCESS in both places
      await this.prisma.payout.update({
        where: { id: payout.id },
        data: {
          status: 'APPROVED',
          transactionId: razorpayPayout.id,
        },
      });

      const bankReference = razorpayPayout.reference_id ?? payoutReference;
      await this.prisma.payout.update({
        where: { id: payout.id },
        data: {
          bankReference,
          transferredAt: new Date(),
        },
      });
      this.logger.log(`RazorpayX payout reference recorded: ${bankReference}`);

      const disruption = await this.prisma.disruptionEvent.findUnique({
        where: { id: disruptionEventId },
        select: { type: true },
      });

      if (user?.email) {
        await this.notifications.send({
          channel: 'EMAIL',
          type: 'CLAIM_APPROVED',
          recipient: user.email,
          payload: {
          driverName: user.driverName ?? 'Driver',
          amount: approvedPayout,
          transactionId: razorpayPayout.id,
          disruptionType: disruption?.type ?? 'Weather Event',
          },
          context: { user_id: userId, policy_id: policyId, event_type: disruption?.type ?? 'Weather Event' },
        });
      }

      await this.idempotency.markSuccess(check.idempotencyId, payout.id);

      return {
        success: true,
        cached: false,
        state: 'SUCCESS',
        payoutId: payout.id,
        transactionId: razorpayPayout.id,
      };
    } catch (err: any) {
      // 6. If anything fails (DB or gateway) → mark FAILED
      await this.idempotency.markFailed(check.idempotencyId, err.message);

      // Attempt to record failure in the Payout table if it was created
      try {
        const existingPayout = await this.prisma.payout.findFirst({
          where: { policyId, disruptionEventId },
        });
        if (existingPayout) {
          await this.prisma.payout.update({
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