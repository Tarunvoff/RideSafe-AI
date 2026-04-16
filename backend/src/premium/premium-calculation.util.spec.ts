import { applyPremiumBounds, computeRawWeeklyPremium, resolveTierCap, MINIMUM_WEEKLY_PREMIUM_INR } from './premium-calculation.util';

describe('premium-calculation.util', () => {
  it('returns minimum floor when Ew is 0', () => {
    const raw = computeRawWeeklyPremium({ Ew: 0, Lf: 0.7, Ct: 0.4 });
    const bounded = applyPremiumBounds(raw, resolveTierCap(0.4));
    expect(bounded).toEqual(MINIMUM_WEEKLY_PREMIUM_INR);
  });

  it('returns correct premium for standard tier', () => {
    const raw = computeRawWeeklyPremium({ Ew: 10000, Lf: 0.5, Ct: 0.6 });
    const bounded = applyPremiumBounds(raw, resolveTierCap(0.6));
    expect(bounded).toEqual(38);
  });

  it('does not exceed tier cap', () => {
    const cap = resolveTierCap(0.6);
    const raw = computeRawWeeklyPremium({ Ew: 30000, Lf: 0.9, Ct: 0.6 });
    const bounded = applyPremiumBounds(raw, cap);
    expect(bounded).toEqual(cap);
  });

  it('handles Lf=0 safely', () => {
    const raw = computeRawWeeklyPremium({ Ew: 8500, Lf: 0, Ct: 0.8 });
    const bounded = applyPremiumBounds(raw, resolveTierCap(0.8));
    expect(raw).toEqual(0);
    expect(bounded).toEqual(MINIMUM_WEEKLY_PREMIUM_INR);
  });
});
