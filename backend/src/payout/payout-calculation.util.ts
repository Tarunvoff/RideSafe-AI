export const DEDUCTIBLE_BASIC_INR = 500;
export const DEDUCTIBLE_STANDARD_INR = 200;
export const DEDUCTIBLE_PREMIUM_INR = 0;

/**
 * Returns deductible by plan tier.
 */
export function resolveDeductible(planType?: string | null): number {
  const normalized = String(planType ?? '').toUpperCase();
  if (normalized === 'BASIC') return DEDUCTIBLE_BASIC_INR;
  if (normalized === 'STANDARD') return DEDUCTIBLE_STANDARD_INR;
  return DEDUCTIBLE_PREMIUM_INR;
}

/**
 * Computes gross payout before deductible.
 */
export function computeGrossPayout(params: { Ew: number; Lf: number; Ct: number }): number {
  const dailyIncome = params.Ew / 7;
  return dailyIncome * params.Ct * params.Lf;
}

/**
 * Applies deductible and prevents negative net payout.
 */
export function computeNetPayout(grossPayout: number, deductible: number): number {
  return Math.max(0, grossPayout - deductible);
}
