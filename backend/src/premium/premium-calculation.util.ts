export const PREMIUM_MARGIN = 0.1;
export const PREMIUM_RATE = 0.015;
export const MAX_WEEKLY_PREMIUM_INR = 50;
export const MINIMUM_WEEKLY_PREMIUM_INR = 50;
export const COHORT_MEDIAN_WEEKLY_EARNINGS_INR = 6800;
export const MIN_HISTORY_DAYS_FOR_PERSONAL_EW = 7;

/**
 * Resolves earnings baseline for low-history drivers.
 */
export function resolveEarningsWithFallback(params: {
  weeklyEarnings: number;
  cohortAverageWeeklyEarnings?: number;
  activeDays: number;
}): number {
  if (params.activeDays >= MIN_HISTORY_DAYS_FOR_PERSONAL_EW && params.weeklyEarnings > 0) {
    return params.weeklyEarnings;
  }
  if ((params.cohortAverageWeeklyEarnings ?? 0) > 0) {
    return Number(params.cohortAverageWeeklyEarnings);
  }
  return COHORT_MEDIAN_WEEKLY_EARNINGS_INR;
}

/**
 * Computes tier cap from coverage factor Ct.
 */
export function resolveTierCap(Ct: number): number {
  const cap = 30 + Ct * 25;
  return Math.min(MAX_WEEKLY_PREMIUM_INR, Math.round(cap * 100) / 100);
}

/**
 * Computes unbounded premium from core equation.
 */
export function computeRawWeeklyPremium(params: { Ew: number; Lf: number; Ct: number }): number {
  const premium = params.Ew * PREMIUM_RATE * params.Lf * params.Ct * (1 + PREMIUM_MARGIN);
  return Math.round(premium * 100) / 100;
}

/**
 * Applies minimum floor and per-tier cap.
 */
export function applyPremiumBounds(rawPremium: number, tierCap: number): number {
  if (rawPremium < MINIMUM_WEEKLY_PREMIUM_INR) {
    return MINIMUM_WEEKLY_PREMIUM_INR;
  }
  if (rawPremium > tierCap) {
    return tierCap;
  }
  return rawPremium;
}
