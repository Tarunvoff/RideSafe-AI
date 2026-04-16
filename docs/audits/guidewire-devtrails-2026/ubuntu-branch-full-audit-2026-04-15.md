# Guidewire DEVTrails 2026 - Full Audit Report

## Audit Metadata

- Date: 2026-04-15
- Scope: Ubuntu branch only
- Evaluator Mode: Checklist validation against Phase 1, Phase 2, Phase 3, constraints, insurance sense, IRDAI, SS Code + DPDP
- Branch Handling Rule Applied: Other branches treated as dummy, assessment performed on ubuntu branch implementation and docs

## Status Legend

- DONE: Requirement is implemented and evidenced
- PARTIAL: Requirement is present but incomplete, inconsistent, or weakly evidenced
- MISSING: Requirement not found or not evidenced

## Checklist Results (All 44 Items)

### Phase 1 - Ideation and Foundation

[1] Root README exists: DONE - Root documentation exists in README.md and includes substantial project detail.

[2] Persona defined (Food/E-commerce/Grocery-QCommerce): DONE - Delivery persona is clearly Gig Delivery Partner for Zepto/Blinkit/Swiggy Instamart, mapping to Grocery/QCommerce.

[3] Weekly premium model with INR numbers: DONE - Weekly premium formula and rupee examples are explicitly documented.

[4] At least 3 parametric triggers with thresholds: DONE - Trigger thresholds include heavy rain, AQI, flood and related zone state conditions.

[5] Web vs Mobile platform choice justification: PARTIAL - Mobile-first behavior is evident, but one explicit consolidated decision rationale section is not clearly stated.

[6] AI/ML integration plan includes premium and fraud: DONE - Documentation and services cover dynamic premium risk scoring and fraud scoring.

[7] Tech stack table or list: DONE - Tech stack and architecture component list are documented.

[8] Development or architecture plan or diagram: DONE - Architecture diagrams and workflow sections are present.

[9] Phase 1 two-minute video link present: MISSING - No clear Phase 1 demo link found in repository docs.

[10] Git repository structured with default branch: DONE - Repo is structured; default branch is configured remotely and project layout is organized.

### Phase 2 - Automation and Protection

[11] Worker registration or onboarding flow (UI + backend): DONE - Auth + KYC backend and mobile onboarding screens exist.

[12] Insurance policy creation weekly enrollment flow: DONE - Policy enrollment flow is implemented with weekly policy activation.

[13] Dynamic premium calculation logic: DONE - Premium varies using Ew, Lf, Ct, and H3 zone risk with ML/redis fallback.

[14] Claims management (file, view, process): PARTIAL - View and process flows are strong; explicit manual claim filing endpoint is not clearly exposed as a separate user action flow.

[15] 3-5 automated parametric triggers implemented: PARTIAL - Multiple trigger states are defined, but evaluated approval path leans primarily on HALTED state logic.

[16] Zero-touch automated claim initiation: DONE - HALTED zone events trigger orchestrator-driven automatic claim evaluation and payout processing.

[17] Phase 2 two-minute demo link present: MISSING - No clear Phase 2 demo link found in repository docs.

### Phase 3 - Scale and Optimize

[18] Advanced fraud detection (GPS spoofing, duplicate claim, anomaly score): PARTIAL - GPS spoof and anomaly scoring are strong; duplicate handling is mostly idempotency and event-level duplicate protection rather than a clearly labeled duplicate-claim detector module.

[19] Instant payout simulation with gateway integration: DONE - Razorpay checkout/order flow and synthetic instant payout reference generation are implemented.

[20] Worker dashboard shows earnings protected and active weekly coverage: DONE - Worker dashboard now surfaces explicit "Earnings Protected" KPI and "Active Weekly Coverage" status with coverage validity date.

[21] Admin or insurer dashboard with loss ratios and predictive analytics: DONE - Admin dashboard and analytics now expose a first-class Loss Ratio KPI alongside premium and approved payout aggregates, while predictive trend visualizations remain available.

[22] Five-minute final demo link present: MISSING - No final 5-minute demo link found in repository docs.

[23] Final pitch deck PDF present or linked: PARTIAL - A PDF exists, but it appears policy-oriented rather than clearly identified as final pitch deck.

[24] Source code on default branch, clean, and has README: PARTIAL - Workspace branch is clean with README, but this audit was intentionally branch-scoped to ubuntu and does not certify default branch checkout cleanliness directly.

### Critical Constraint Compliance

[25] Health/life/accident/vehicle repair excluded everywhere: MISSING - Some exclusions are documented, but accident/liability language appears in UI copy and weakens strict exclusion compliance.

[26] All pricing structured weekly only: DONE - Weekly pricing language and endpoints are consistently used.

[27] Coverage scope income-loss-only everywhere: MISSING - Some UI copy references accidents/deactivation/liability, so scope is not strictly clean end-to-end.

### Insurance Sense Checklist

[28] Objective, verifiable trigger with numeric threshold: PARTIAL - Strong numeric thresholds in docs; code-level threshold transparency is less explicit in central trigger approval path.

[29] Fully automatic payout path trigger to GPS verify to transfer: PARTIAL - Trigger, zone match, and fraud gating exist; transfer is simulated synthetic flow rather than a fully explicit UPI rail execution path.

[30] Pool sustainability metric (BCR or loss ratio) computed: DONE (Post-remediation) - Admin analytics now computes and returns loss ratio, lossRatioPercent, and benefitCostRatio as named metrics.

[31] Fraud detection uses data (GPS cross-check or zone validation): DONE - H3 consistency, velocity, and burst signals are data-driven and implemented.

[32] Frictionless premium collection (UPI autopay or platform deduction): PARTIAL - UPI autopay concept is documented; implemented flow is primarily Razorpay order/checkout style.

[33] Pricing is dynamic, not flat: DONE - Dynamic premium logic is implemented with risk-linked inputs.

[34] Adverse selection lockout before weather event: DONE (Post-remediation) - Policy enrollment now applies a 24-hour cooling-off period before coverage activation, and payout flow rejects cooling-period policy use.

[35] Operational cost near zero (straight-through processing): PARTIAL - Strong automation exists, but manual review queues remain for KYC/fraud exceptions.

[36] Basis risk minimized with hyper-local weather-to-zone matching: DONE - H3 zone matching and policy zone consistency checks are implemented.

### IRDAI Compliance

[37] Pricing auto-adjusts by season or area: DONE - Seasonal/geospatial feature engineering and zone risk linked pricing exist.

[38] Worker location matched to local weather for payout accuracy: DONE - H3 zone checks are enforced before payout approval.

[39] Fraud prevention against location spoofing implemented: DONE - Teleport, speed, mismatch, and zone consistency signals are used.

[40] Historical frequency data used for sustainability proof: PARTIAL - Historical trends and risk history exist, but explicit actuarial sustainability proof metric is not formalized.

### SS Code + DPDP Act

[41] 90/120-day engagement eligibility rule in onboarding: DONE (Post-remediation) - Explicit engagement gating now enforced and exposed in onboarding status.

[42] GPS data collection consent screen present: DONE - Terms acceptance and location permission flows are present.

[43] Bank/UPI collection with explicit consent + KYC: DONE (Post-remediation) - Standalone explicit financial consent is enforced in payout setup DTO/UI and persisted with version + timestamp metadata.

[44] Platform activity data sharing agreement mention: DONE (Post-remediation) - Terms and privacy configuration now contain explicit platform activity data-sharing consent language and legal notice for regulated partner processing.

## Complete Problem Register (Do Not Skip)

This section is the full actionable problem backlog from this audit pass. It includes every checklist gap plus additional engineering issues found in code structure and endpoint security review.

### A) Product, Compliance, and Submission Problems (Checklist Gaps)

P-001 (High) - Missing Phase 1 demo link: No explicit Phase 1 video URL in repo docs.

P-002 (High) - Missing Phase 2 demo link: No explicit Phase 2 video URL in repo docs.

P-003 (High) - Missing final 5-minute demo link: Final demo evidence is absent in repo docs.

P-004 (High) - Pitch deck ambiguity: Existing PDF appears policy-oriented; final pitch deck is not clearly labeled.

P-005 (Medium) - Platform decision rationale incomplete: Mobile-first intent exists, but explicit Web vs Mobile decision logic is not clearly centralized.

P-006 (High) - Claims filing flow incomplete: Claim view and auto-process exist, but user-facing explicit manual claim filing endpoint is unclear as a separate journey.

P-007 (High) - Trigger breadth implementation mismatch: Multiple trigger states are declared, but central approve logic relies mainly on HALTED semantics.

P-008 (Critical) - Constraint leakage (excluded coverage): UI/docs still include accident/liability style phrasing, conflicting with strict exclusion constraint.

P-009 (Critical) - Income-loss-only scope not clean: Non-income-loss language appears in UI copy, violating strict scope consistency.

P-010 (Medium) - Trigger transparency gap: Numeric thresholds are strong in docs, but backend trigger path does not expose equally explicit threshold decision mapping.

P-011 (Medium) - End-to-end payout realism gap: Trigger->fraud->payout path is automated, but transfer rail is simulated and not explicit production UPI execution.

P-012 (Resolved) - No explicit BCR/loss-ratio computation: FIXED (Post-remediation) - Admin summary now exposes named loss ratio and benefit-cost metrics.

P-013 (Medium) - Premium collection implementation mismatch: UPI AutoPay is documented conceptually, while implemented payment path is Razorpay order/verify flow.

P-014 (Resolved) - No adverse selection lockout: FIXED (Post-remediation) - New policies now activate after a cooling-off period and cannot be used for immediate payout during lockout.

P-015 (Medium) - Straight-through processing not complete: Manual queues still required for KYC/fraud edge cases.

P-016 (Medium) - Historical sustainability proof incomplete: Historical trends exist, but explicit actuarial proof metric is not formalized for judges.

P-017 (High) - 90/120-day eligibility rule: FIXED (Post-remediation) - Onboarding now has explicit SS Code engagement gating.

P-018 (Resolved) - Financial consent granularity weak: FIXED (Post-remediation) - Explicit standalone financial consent is now required and versioned.

P-019 (Resolved) - Platform data-sharing agreement unclear: FIXED (Post-remediation) - Explicit platform activity data-sharing consent wording is now present in terms/privacy legal surfaces.

P-020 (Resolved) - Worker protection KPI clarity gap closed: Worker dashboard now exposes explicit "Earnings Protected" KPI and active weekly coverage status.

P-021 (Resolved) - Admin loss-ratio visibility gap closed: Loss ratio is now surfaced as a first-class KPI with premium and payout aggregates.

P-022 (Low) - Default-branch audit completeness gap: This report is ubuntu-scoped by instruction and does not certify default branch runtime cleanliness in checked-out state.

P-023 (Low) - Deliverables discoverability gap: Submission artifacts are not grouped in a single canonical "Deliverables" section for judges.

### B) Additional Engineering Problems Found in Codebase

P-024 (Critical) - Policy enrollment endpoint unauthenticated: policy enroll is exposed without JwtAuthGuard, enabling enrollment attempts with supplied driverId.
Evidence: backend/src/insurance/policy.controller.ts (lines 11-15).

P-025 (High) - Policy status endpoint unauthenticated by driverId path: status lookup uses path driverId without guard.
Evidence: backend/src/insurance/policy.controller.ts (lines 36-39).

P-026 (Critical) - Claims listing endpoint unauthenticated: claims by driverId is exposed without JwtAuthGuard.
Evidence: backend/src/insurance/claims.controller.ts (lines 8-12).

P-027 (High) - Broad unauthenticated controller surface risk: multiple controllers have no UseGuards annotations and should be explicitly reviewed for auth boundaries.
Detected files: insurance.controller.ts, dynamic-qcommerce.controller.ts, platform-activity.controller.ts, support.controller.ts, internal-state.controller.ts, payout.controller.ts, payouts.controller.ts, trigger.controller.ts, telemetry.controller.ts, ingestion.controller.ts.

P-028 (High) - Driver register flow auto-verifies accounts: register sets isVerified true immediately, reducing identity assurance.
Evidence: backend/src/auth/auth.service.ts (lines 95-108).

P-029 (High) - Admin 2FA disabled in code path: adminVerifyOtp intentionally throws disabled profile error; admin login is password-only.
Evidence: backend/src/auth/auth.service.ts (lines 271-290).

P-030 (Medium) - Missing constant-time signature comparison: payment signature compare uses regular equality with comment noting stronger approach would be better.
Evidence: backend/src/payments/payments.service.ts (line 67 onward).

P-031 (Medium) - Repository naming inconsistency/typo: top-level folder name ml-services appears misspelled and duplicated against ml-services conventions.
Evidence: folder ml-services.

P-032 (Medium) - Duplicate service variants increase drift risk: both grid_event_service and grid-event-service exist in ml-services and another grid-event-service exists under ml-services.
Evidence: ml-services/grid_event_service, ml-services/grid-event-service, ml-services/grid-event-service.

P-033 (Medium) - Committed frontend build artifact: frontend/mobile/dist is present in repository and should not typically be committed for source-only repos.
Evidence: frontend/mobile/dist.

P-034 (High) - No CI workflow definitions found: .github/workflows is absent, so automated checks on push/PR are not visible in repo.
Evidence: no workflow files detected.

P-035 (Medium) - Low first-party test footprint relative to codebase size: only 3 first-party test files were detected outside node_modules.
Evidence: backend/src/premium/premium-calculation.util.spec.ts, backend/src/payout/payout-calculation.util.spec.ts, ml-services/ml-insurance-service/tests/test_fraud_service.py.

P-036 (Low) - Historical BUG comment retained in production path: code includes an explicit v1 BUG note; although fixed, leaving such markers may signal incomplete cleanup discipline.
Evidence: ml-services/grid-event-service/services/zone_aggregator.py (line 155).

P-037 (Low) - Documentation-to-implementation drift risk: Several high-level README commitments (UPI AutoPay, strict trigger set semantics, sustainability proof metrics) are ahead of directly auditable API-level implementation details.

### C) Diagnostics Snapshot

- Compiler/linter diagnostics from workspace scan: no active errors reported at scan time.
- This does not mean no runtime defects; it only confirms no surfaced editor diagnostics in the sampled environment.

### D) Recommended Fix Order (Mandatory First)

1. Lock down unauthenticated policy/claims endpoints (P-024, P-025, P-026, P-027).
2. Add missing submission artifacts/links (P-001, P-002, P-003, P-004, P-023).
3. Enforce strict income-loss-only wording and exclusion constraints in UI/docs (P-008, P-009).
4. Sustainability metrics and adverse-selection control: P-012 and P-014 completed; P-016 remains open for judge-facing actuarial proof narrative.
5. SS Code eligibility and explicit financial/data-sharing consent wording (P-017, P-018, P-019): COMPLETED in post-remediation updates.
6. Clean repo hygiene and reliability baseline (P-031, P-032, P-033, P-034, P-035).

## Post-Audit Remediation Update (2026-04-15)

The findings below were remediated after this audit snapshot and should be treated as fixed in current ubuntu branch code.

- P-017 (High) - 90/120-day eligibility rule: FIXED.
  - Shared eligibility gate now enforces 90-day minimum for BASIC/STANDARD and 120-day minimum for PREMIUM before policy enrollment and payout processing.
  - Onboarding/KYC now exposes engagement eligibility and blocks KYC submit below the minimum engagement threshold.
  - Evidence: backend/src/compliance/driver-eligibility.util.ts, backend/src/insurance/insurance.service.ts, backend/src/payments/payments.service.ts, backend/src/payout/payout.service.ts, backend/src/plans/plans.service.ts, backend/src/kyc/kyc.service.ts.

- P-018 (Medium) - Financial consent granularity: FIXED.
  - KYC payout setup now requires explicit financial consent and captures consent version + timestamp.
  - Schema and migration added for persistent consent metadata.
  - Evidence: backend/src/kyc/dto/kyc.dto.ts, backend/src/kyc/kyc.service.ts, backend/prisma/schema.prisma, backend/prisma/migrations/20260415000000_add_financial_consent_fields/migration.sql.

- P-019 (Medium) - Platform data-sharing agreement mention: FIXED.
  - Terms acceptance copy now includes explicit platform activity data-sharing consent wording.
  - Support legal configuration now returns explicit legal notice and privacy section for platform activity data sharing with regulated partners.
  - Evidence: frontend/mobile/src/i18n/locales/en.json, backend/src/support/support.controller.ts.

- P-012 (High) - BCR/loss-ratio computation: FIXED.
  - Admin summary now returns lossRatio, lossRatioPercent, and benefitCostRatio as named sustainability KPIs.
  - Evidence: backend/src/admin/admin.service.ts, frontend/mobile/src/services/api.ts, frontend/mobile/src/screens/admin/AdminDashboardScreen.tsx.

- P-014 (High) - Adverse selection lockout: FIXED.
  - Policy enrollment now sets coverage start after a 24-hour cooling-off period.
  - Payout processing now enforces active policy window and blocks cooling-period policy usage.
  - Evidence: backend/src/insurance/insurance.service.ts, backend/src/payout/payout.service.ts.

- P-028 (High) - Register auto-verification: FIXED.
  - Registration no longer sets users verified by default.
  - Registration now issues email OTP and requires verify step.
  - Evidence: backend/src/auth/auth.service.ts.

- P-029 (High) - Admin 2FA disabled: FIXED.
  - Admin login now sends OTP challenge.
  - Admin token issuance moved to OTP verification endpoint.
  - Evidence: backend/src/auth/auth.service.ts.

## Summary Count

- DONE: 27
- PARTIAL: 11
- MISSING: 6

## Top 3 Critical Gaps (High Judge Risk)

1. Missing mandatory demo evidence links for Phase 1, Phase 2, and final demo.
2. Scope leakage against constraints: non-income-loss language still appears in UI copy.
3. Historical sustainability proof is still incomplete for judges (formal actuarial frequency narrative remains partial).

## Top 3 Quick Wins (Under 2 Hours)

1. Add a Deliverables section in root README with Phase 1, Phase 2, final demo, and pitch deck links.
2. Normalize UI copy to strict income-loss-only positioning and remove accident/liability ambiguity.
3. Add a concise actuarial sustainability proof note (historical frequency + ratio interpretation) for judges.

## Suggested Folder Structure (Implemented)

docs/
  audits/
    guidewire-devtrails-2026/
      README.md
      ubuntu-branch-full-audit-2026-04-15.md
