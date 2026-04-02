# Guidewire DEVTrails 2026 - Phase 3 (Scale & Optimise)

## Timeline
- Dates: April 5 - April 17 (Weeks 5-6)
- Theme: Perfect for Your Worker

## Mandatory Guardrails (Final Validation)
- Persona remains delivery-worker subcategory only.
- Coverage remains strictly income-loss protection only.
- Exclude health, life, accidents, and vehicle repairs.
- Weekly pricing model remains the commercial base.

## Phase 3 Enhancement Goals

### 1) Advanced Fraud Detection
Implement delivery-specific fraud controls such as:
- GPS spoofing detection.
- Fake weather/event claim checks using historical and source-of-truth comparisons.
- Repeated claim pattern anomaly detection across users/zones/timelines.

### 2) Instant Payout System (Simulated Accepted)
- Integrate payment rails in test/sandbox/mock mode (example: Razorpay test mode, Stripe sandbox, UPI simulator).
- Demonstrate instant/near-instant payout lifecycle:
  - Claim approved (automated/assisted)
  - Disbursement initiated
  - Worker receives payout confirmation

### 3) Intelligent Dashboards

#### Worker View
- Active weekly coverage
- Protected earnings summary
- Claims/payout history
- Upcoming risk alerts (optional enhancement)

#### Insurer/Admin View
- Loss ratios
- Trigger frequency by zone/time
- Fraud flags and investigation funnel
- Predictive analytics for next-week disruption risk and expected claims

## Final Submission Package (Week 6 Judging)

### 1) 5-Minute Demo Video (Public Link)
Must visually demonstrate:
- Simulated disruption event (example: fake rainstorm / zone closure)
- Automated parametric trigger detection
- AI-assisted claim approval/decisioning
- Payout completion to worker account/wallet (simulated accepted)

### 2) Final Pitch Deck (PDF)
Must cover:
- Chosen delivery persona and problem fit
- AI architecture (pricing + prediction + fraud)
- Parametric trigger logic and operational flow
- Weekly pricing business viability
- Key metrics, outcomes, scalability, and go-to-market logic

## Suggested Phase 3 Technical Checklist
- Fraud model/rules upgraded and benchmarked.
- Payment simulation integrated with clear status states.
- Worker and admin dashboards complete with meaningful KPIs.
- End-to-end observability/logging for trigger -> claim -> payout.
- Demo scripts prepared for disruption simulation.
- Business metrics aligned with weekly pricing economics.

## Final Acceptance Criteria
- Platform demonstrates complete parametric insurance cycle for gig workers.
- Automated disruption-triggered claim path is reliable and explainable.
- Fraud and payout systems are production-directional (even if sandboxed).
- Weekly model remains central and defensible.
- No out-of-scope insurance coverage is included.
