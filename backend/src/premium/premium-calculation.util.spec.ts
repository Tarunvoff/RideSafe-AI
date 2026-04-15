import test = require('node:test');
import assert = require('node:assert/strict');
import {
  applyPremiumBounds,
  computeRawWeeklyPremium,
  resolveTierCap,
  MINIMUM_WEEKLY_PREMIUM_INR,
} from './premium-calculation.util';

test('returns minimum floor when Ew is 0', () => {
  const raw = computeRawWeeklyPremium({ Ew: 0, Lf: 0.7, Ct: 0.4 });
  const bounded = applyPremiumBounds(raw, resolveTierCap(0.4));
  assert.equal(bounded, MINIMUM_WEEKLY_PREMIUM_INR);
});

test('returns correct premium for standard tier', () => {
  const raw = computeRawWeeklyPremium({ Ew: 10000, Lf: 0.5, Ct: 0.6 });
  const bounded = applyPremiumBounds(raw, resolveTierCap(0.6));
  assert.equal(bounded, 38);
});

test('does not exceed tier cap', () => {
  const cap = resolveTierCap(0.6);
  const raw = computeRawWeeklyPremium({ Ew: 30000, Lf: 0.9, Ct: 0.6 });
  const bounded = applyPremiumBounds(raw, cap);
  assert.equal(bounded, cap);
});

test('handles Lf=0 safely', () => {
  const raw = computeRawWeeklyPremium({ Ew: 8500, Lf: 0, Ct: 0.8 });
  const bounded = applyPremiumBounds(raw, resolveTierCap(0.8));
  assert.equal(raw, 0);
  assert.equal(bounded, MINIMUM_WEEKLY_PREMIUM_INR);
});
