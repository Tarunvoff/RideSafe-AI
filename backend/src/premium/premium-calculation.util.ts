/** 
 * Actuarial Engine: Implements the core mathematical models for real-time risk-adjusted 
 * premium calculations, incorporating loss factors, coverage tiers, and cohort fallbacks.
 *
 * For the mathematical foundation of these calculations, refer to 
 * ARCHITECTURE/DYNAMIC_ACTUARIAL_PRICING_ENGINE.md.
 */
/**
 * Safety loading added to expected loss to keep premium pool solvent after operating costs.
 */
export const PREMIUM_MARGIN = 0.1;

/**
 * Base premium rate applied to weekly earnings.
 * Proxy rate derived from MoRTH 2022: 0.045 freq x INR 25,000 severity x 1.25 on-duty loading / 52 weeks ~= INR 27/week,
 * normalized to percent of weekly earnings ~= 1.5%.
 */
export const PREMIUM_RATE = 0.015;

/**
 * Absolute portfolio ceiling for weekly premium before any reinsurance layer applies.
 * DevTrails Rule: Target range strictly 20-50 INR per worker per week.
 */
export const MAXIMUM_WEEKLY_PREMIUM_INR = 50;

/**
 * Minimum active-policy weekly premium floor to ensure non-zero risk contribution for entry tier.
 * DevTrails Rule: Target range strictly 20-50 INR per worker per week.
 */
export const MINIMUM_WEEKLY_PREMIUM_INR = 20;

/**
 * Resolves tier-specific minimum floor proportional to coverage.
 */
export function resolveTierFloor(Ct: number): number {
  const roundedCt = Math.round(Ct * 10) / 10;
  // Non-overlapping floors strictly bounded between 20 and 50
  if (roundedCt <= 0.45) return 20; // BASIC
  if (roundedCt <= 0.65) return 25; // STANDARD
  if (roundedCt <= 0.75) return 30; // PREMIUM
  if (roundedCt <= 0.85) return 40; // ELITE

  // Linear interpolation bounded strictly within the 20-50 target range
  return 40 + ((roundedCt - 0.8) / 0.1) * (50 - 40);
}

/**
 * Cohort fallback for weekly earnings when a driver has insufficient personal earning history.
 */
export const COHORT_MEDIAN_WEEKLY_EARNINGS_INR = 6800;

/**
 * Minimum observed active days required before trusting personal earnings over cohort fallback.
 */
export const MIN_HISTORY_DAYS_FOR_PERSONAL_EW = 7;

/**
 * Tier cap for BASIC coverage (Ct=0.4) strictly aligning with 20-50 range.
 */
export const BASIC_TIER_CAP_INR = 30;

/**
 * Tier cap for STANDARD coverage (Ct=0.6) strictly aligning with 20-50 range.
 */
export const STANDARD_TIER_CAP_INR = 40;

/**
 * Tier cap for PREMIUM coverage (Ct=0.8) strictly aligning with 20-50 range maximum constraint.
 */
export const PREMIUM_TIER_CAP_INR = 50;

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
  const roundedCt = Math.round(Ct * 10) / 10;
  if (roundedCt === 0.4) return BASIC_TIER_CAP_INR;
  if (roundedCt === 0.6) return STANDARD_TIER_CAP_INR;
  if (roundedCt === 0.8) return PREMIUM_TIER_CAP_INR;

  const interpolatedCap = BASIC_TIER_CAP_INR + ((roundedCt - 0.4) / 0.4) * (PREMIUM_TIER_CAP_INR - BASIC_TIER_CAP_INR);
  return Math.min(MAXIMUM_WEEKLY_PREMIUM_INR, Math.max(BASIC_TIER_CAP_INR, Math.round(interpolatedCap * 100) / 100));
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
export function applyPremiumBounds(rawPremium: number, tierCap: number, tierFloor: number = MINIMUM_WEEKLY_PREMIUM_INR): number {
  if (rawPremium < tierFloor) {
    return tierFloor;
  }
  if (rawPremium > tierCap) {
    return tierCap;
  }
  return rawPremium;
}
