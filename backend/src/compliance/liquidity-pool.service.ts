import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

/**
 * ── Actuarial Liquidity & Reserve Stratification Engine ──────────────────────
 * 
 * This service manages the "System Liquidity Pool," the financial beating heart 
 * of the Aegis platform. It implements a unique triple-partition stratification 
 * model that ensures mathematical solvency even during high-velocity payout cycles.
 * 
 * For detailed mathematical foundations, refer to:
 * ARCHITECTURE/ACTUARIAL_RESERVE_STRATIFICATION.md
 */
@Injectable()
export class LiquidityPoolService {
  private readonly logger = new Logger(LiquidityPoolService.name);
  private readonly POOL_KEY = 'SYSTEM_LIQUIDITY';
  private readonly RESERVE_KEY = 'CONTINGENCY_RESERVE';
  private readonly OPERATING_FUND_KEY = 'OPERATING_FUND';

  // Actuarial Stratification Coefficients
  private readonly RISK_POOL_WEIGHT = 0.80;      // 80% to active risk pool
  private readonly CONTINGENCY_WEIGHT = 0.15;    // 15% to catastrophic buffer
  private readonly OPERATING_WEIGHT = 0.05;      // 5% platform sustainability fee

  constructor(private readonly prisma: PrismaService) {}

  private isMissingSystemSettingsTableError(error: unknown): boolean {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      return error.code === 'P2021';
    }
    const message = error instanceof Error ? error.message : String(error);
    return message.includes('system_settings') && message.includes('does not exist');
  }

  /**
   * Performs an Actuarial Injection of fresh premium capital into the ecosystem.
   * Unlike generic additions, this stratified injection partitions funds 
   * to guarantee long-term system solvency.
   */
  async injectPremium(amountRupees: number, correlationId?: string) {
    const riskAmount = amountRupees * this.RISK_POOL_WEIGHT;
    const contingencyAmount = amountRupees * this.CONTINGENCY_WEIGHT;
    const operatingAmount = amountRupees * this.OPERATING_WEIGHT;

    this.logger.log(
      `[LIQUIDITY_INJECTION] cid=${correlationId ?? 'N/A'} Total=${amountRupees} INR | ` +
      `Risk=${riskAmount.toFixed(2)} | Contingency=${contingencyAmount.toFixed(2)} | Ops=${operatingAmount.toFixed(2)}`
    );

    try {
      return await this.prisma.$transaction(async (tx) => {
        // 1. Update Core Risk Pool (SYSTEM_LIQUIDITY)
        const currentPool = await tx.systemSetting.findUnique({ where: { key: this.POOL_KEY } });
        const newPoolVal = Number(currentPool?.value ?? 5000000) + riskAmount;
        await tx.systemSetting.upsert({
          where: { key: this.POOL_KEY },
          create: { key: this.POOL_KEY, value: String(newPoolVal) },
          update: { value: String(newPoolVal) },
        });

        // 2. Update Contingency Reserve
        const currentReserve = await tx.systemSetting.findUnique({ where: { key: this.RESERVE_KEY } });
        const newReserveVal = Number(currentReserve?.value ?? 1000000) + contingencyAmount;
        await tx.systemSetting.upsert({
          where: { key: this.RESERVE_KEY },
          create: { key: this.RESERVE_KEY, value: String(newReserveVal) },
          update: { value: String(newReserveVal) },
        });

        // 3. Update Operating Fund
        const currentOps = await tx.systemSetting.findUnique({ where: { key: this.OPERATING_FUND_KEY } });
        const newOpsVal = Number(currentOps?.value ?? 0) + operatingAmount;
        await tx.systemSetting.upsert({
          where: { key: this.OPERATING_FUND_KEY },
          create: { key: this.OPERATING_FUND_KEY, value: String(newOpsVal) },
          update: { value: String(newOpsVal) },
        });

        return {
          totalInjected: amountRupees,
          newPoolBalance: newPoolVal,
          newReserveBalance: newReserveVal,
        };
      });
    } catch (error) {
      if (this.isMissingSystemSettingsTableError(error)) {
        this.logger.warn(
          '[LIQUIDITY_DEGRADED_MODE] system_settings table missing; skipping liquidity ledger update to avoid blocking policy issuance.',
        );
        return {
          totalInjected: amountRupees,
          newPoolBalance: null,
          newReserveBalance: null,
        };
      }
      throw error;
    }
  }

  /**
   * Executes a deterministic withdrawal for claim settlements.
   * Implements a "Panic-Buffer" fallback: if Core Risk Pool is depleted, 
   * it evaluates eligibility to tap the Contingency Reserve.
   */
  async withdrawPayout(amountRupees: number, referenceId: string) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const currentPool = await tx.systemSetting.findUnique({ where: { key: this.POOL_KEY } });
        let poolBalance = Number(currentPool?.value ?? 5000000);

      if (poolBalance < amountRupees) {
        // Evaluate "Reserve Tapping" Eligibility
        const currentReserve = await tx.systemSetting.findUnique({ where: { key: this.RESERVE_KEY } });
        const reserveBalance = Number(currentReserve?.value ?? 0);

        if (poolBalance + reserveBalance < amountRupees) {
          this.logger.error(`[LIQUIDITY_CRUNCH] Total solvency (${poolBalance + reserveBalance}) insufficient for payout ${referenceId}`);
          throw new Error('GATEWAY_REJECTION: Insufficient Platform Solvency');
        }

        this.logger.warn(`[RESERVE_TAP] Core Pool depleted (${poolBalance}). Tapping Contingency Reserve for payout ${referenceId}`);
        
        // Drain Core Pool first, then take the rest from Reserve
        const diff = amountRupees - poolBalance;
        await tx.systemSetting.upsert({
          where: { key: this.POOL_KEY },
          create: { key: this.POOL_KEY, value: '0' },
          update: { value: '0' }
        });
        await tx.systemSetting.upsert({
          where: { key: this.RESERVE_KEY },
          create: { key: this.RESERVE_KEY, value: String(reserveBalance - diff) },
          update: { value: String(reserveBalance - diff) }
        });

        return { withdrawnFrom: 'MIXED', remainingPool: 0, remainingReserve: reserveBalance - diff };
      }

      // Standard withdrawal from Core Risk Pool
      const nextPoolVal = poolBalance - amountRupees;
      await tx.systemSetting.upsert({
        where: { key: this.POOL_KEY },
        create: { key: this.POOL_KEY, value: String(nextPoolVal) },
        update: { value: String(nextPoolVal) },
      });

        return { withdrawnFrom: 'CORE', remainingPool: nextPoolVal };
      });
    } catch (error) {
      if (this.isMissingSystemSettingsTableError(error)) {
        this.logger.warn(
          `[LIQUIDITY_DEGRADED_MODE] system_settings table missing; allowing payout ${referenceId} without ledger withdrawal tracking.`,
        );
        return { withdrawnFrom: 'UNTRACKED', remainingPool: null, remainingReserve: null };
      }
      throw error;
    }
  }

  /**
   * Provides a forensic snapshot of the platform's liquidity health.
   */
  async getLiquidityStatus() {
    let pool: { value: string } | null = null;
    let reserve: { value: string } | null = null;
    let ops: { value: string } | null = null;
    try {
      [pool, reserve, ops] = await Promise.all([
        this.prisma.systemSetting.findUnique({ where: { key: this.POOL_KEY }, select: { value: true } }),
        this.prisma.systemSetting.findUnique({ where: { key: this.RESERVE_KEY }, select: { value: true } }),
        this.prisma.systemSetting.findUnique({ where: { key: this.OPERATING_FUND_KEY }, select: { value: true } }),
      ]);
    } catch (error) {
      if (this.isMissingSystemSettingsTableError(error)) {
        this.logger.warn('[LIQUIDITY_DEGRADED_MODE] system_settings table missing; returning fallback liquidity status.');
      } else {
        throw error;
      }
    }

    const poolVal = Number(pool?.value ?? 0);
    const reserveVal = Number(reserve?.value ?? 0);
    const totalLiquidity = poolVal + reserveVal;

    return {
      coreRiskPool: poolVal,
      contingencyReserve: reserveVal,
      operatingFund: Number(ops?.value ?? 0),
      totalCapital: totalLiquidity,
      status: totalLiquidity > 5000000 ? 'HEALTHY' : totalLiquidity > 1000000 ? 'STABLE' : 'CRITICAL',
    };
  }
}
