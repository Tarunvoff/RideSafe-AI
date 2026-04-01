export const PLAN_CT = {
  BASIC: 0.4,
  STANDARD: 0.6,
  PREMIUM: 0.8,
} as const;

export type PlanTier = keyof typeof PLAN_CT;

export const normalizePlanTier = (plan: string | null | undefined): PlanTier | null => {
  if (!plan) return null;
  const normalized = plan.trim().toUpperCase();
  if (Object.prototype.hasOwnProperty.call(PLAN_CT, normalized)) {
    return normalized as PlanTier;
  }
  return null;
};

export const ctForPlan = (plan: string | null | undefined): number | null => {
  const tier = normalizePlanTier(plan);
  return tier ? PLAN_CT[tier] : null;
};
