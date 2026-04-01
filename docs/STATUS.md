# Current Status (April 2, 2026)

## Policy System
- Added strict plan tiers: BASIC, STANDARD, PREMIUM with fixed Ct.
- Policy enrollment endpoint: POST /policy/enroll.
- Policy state cached in Redis with zone + Ct.

## Pricing & Payout Rules
- Premium formula: Pr = Ew * 0.015 * Lf * Ct * (1 + M), M=0.1.
- Trigger only when zone_state == HALTED.
- Payout blocked without active policy, valid period, and zone match.
- Fraud blocks payout when fraudScore > 0.7.

## Orchestration
- POST /insurance/process/:driverId now enforces policy + HALTED rules.
- Direct payout endpoint now enforces policy ownership + zone match + HALTED.

## H3 Feature Pipeline
- Added STRICT_REALTIME mode to disable fallbacks.
- Pipeline returns 424 when realtime features are missing.
- ML risk/pricing failures return 503 in strict mode.

## Tests Run
- test_parametric_insurance.js (enroll + premium + payout flow)
