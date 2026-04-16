import { computeGrossPayout, computeNetPayout, resolveDeductible } from './payout-calculation.util';

describe('payout-calculation.util', () => {
  it('basic plan deductible is 500', () => {
    expect(resolveDeductible('BASIC')).toEqual(500);
  });

  it('standard plan deductible is 200', () => {
    expect(resolveDeductible('STANDARD')).toEqual(200);
  });

  it('premium plan has zero deductible', () => {
    expect(resolveDeductible('PREMIUM')).toEqual(0);
  });

  it('net payout applies deductible floor at zero', () => {
    const gross = computeGrossPayout({ Ew: 2100, Lf: 0.5, Ct: 0.4 });
    const net = computeNetPayout(gross, 500);
    expect(net).toEqual(0);
  });

  it('net payout applies deductible for payable claim', () => {
    const gross = computeGrossPayout({ Ew: 14000, Lf: 0.8, Ct: 0.8 });
    const net = computeNetPayout(gross, 200);
    expect(Math.round(net * 100) / 100).toEqual(Math.round((gross - 200) * 100) / 100);
  });
});
