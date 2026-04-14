import test = require('node:test');
import assert = require('node:assert/strict');
import {
  applyPremiumBounds,
  computeRawWeeklyPremium,
  resolveEarningsWithFallback,
  resolveTierCap,
  MINIMUM_WEEKLY_PREMIUM_INR,
} from './premium-calculation.util';

test('premium uses cohort fallback for low history driver', () => {
  const result = resolveEarningsWithFallback({
    weeklyEarnings: 0,
    cohortAverageWeeklyEarnings: 7200,
    activeDays: 3,
  });
  assert.equal(result, 7200);
});

test('premium floor is enforced', () => {
  const raw = computeRawWeeklyPremium({ Ew: 1000, Lf: 0.2, Ct: 0.4 });
  const bounded = applyPremiumBounds(raw, resolveTierCap(0.4));
  assert.equal(bounded, MINIMUM_WEEKLY_PREMIUM_INR);
});

test('premium cap is enforced for high earnings', () => {
  const cap = resolveTierCap(0.6);
  const raw = computeRawWeeklyPremium({ Ew: 30000, Lf: 0.9, Ct: 0.6 });
  const bounded = applyPremiumBounds(raw, cap);
  assert.equal(bounded, cap);
});
