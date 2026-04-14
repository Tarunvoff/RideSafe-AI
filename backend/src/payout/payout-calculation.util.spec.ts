import test = require('node:test');
import assert = require('node:assert/strict');
import {
  computeGrossPayout,
  computeNetPayout,
  resolveDeductible,
} from './payout-calculation.util';

test('basic plan deductible is 500', () => {
  assert.equal(resolveDeductible('BASIC'), 500);
});

test('standard plan deductible is 200', () => {
  assert.equal(resolveDeductible('STANDARD'), 200);
});

test('premium plan has zero deductible', () => {
  assert.equal(resolveDeductible('PREMIUM'), 0);
});

test('net payout applies deductible floor at zero', () => {
  const gross = computeGrossPayout({ Ew: 2100, Lf: 0.5, Ct: 0.4 });
  const net = computeNetPayout(gross, 500);
  assert.equal(net, 0);
});

test('net payout applies deductible for payable claim', () => {
  const gross = computeGrossPayout({ Ew: 14000, Lf: 0.8, Ct: 0.8 });
  const net = computeNetPayout(gross, 200);
  assert.equal(Math.round(net * 100) / 100, Math.round((gross - 200) * 100) / 100);
});
