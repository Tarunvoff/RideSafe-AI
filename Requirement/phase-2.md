# Guidewire DEVTrails 2026 - Phase 2 (Automation & Protection)

## Timeline
- Dates: March 21 - April 4 (Weeks 3-4)
- Theme: Protect Your Worker

## Mandatory Guardrails (Carry Forward)
- Delivery-partner persona only.
- Coverage remains loss of income only.
- No health/life/accident/vehicle repair features.
- Premium model must remain weekly.

## Phase 2 Core Build Objectives
Implement an executable platform that demonstrates:
- Registration process
- Insurance policy management
- Dynamic premium calculation (weekly)
- Claims management with parametric automation

## Must-Have Technical Features (Expected in Working Form)

### AI-Powered Risk Assessment
- Dynamic weekly premium calculation.
- Predictive risk modeling tied to chosen delivery persona and location profile.

### Intelligent Fraud Detection (Initial Implementation)
- Anomaly detection for suspicious claims.
- Location/activity validation.
- Duplicate claim prevention.

### Parametric Automation
- Real-time trigger monitoring from APIs/mocks.
- Auto claim initiation when disruption thresholds are met.
- Instant payout flow (can be simulated in this phase if full integration is pending).

### Integrations (Real or Mock)
- Weather API integration (free tier/mock allowed).
- Traffic data integration (mock acceptable).
- Platform/job availability API integration (simulated acceptable).
- Payment system integration (mock/sandbox acceptable).

## Specific Expectations for Phase 2 Demo
- Build 3-5 automated triggers for disruption events.
- Show zero-touch claim experience as much as possible:
  - Trigger detected
  - Eligibility validated
  - Claim created automatically
  - Payout process initiated
- Show dynamic weekly premium changing with risk inputs.

## Required Submission Artifacts
- 2-minute demo video (publicly accessible).
- Executable source code with implemented modules listed above.

## Suggested Phase 2 Checklist
- Worker onboarding/registration complete.
- Weekly plan creation/edit/view complete.
- Risk score pipeline connected to premium output.
- Trigger engine supports at least 3 disruptions.
- Claim service supports automated and manual traceability.
- Fraud rules for location/time/duplicate checks operational.
- Payout simulation path complete with transaction logs.
- End-to-end happy path test recorded.

## Exit Criteria for Phase 2
- End-to-end flow works from onboarding to claim processing.
- Weekly pricing updates are measurable and explainable.
- Triggered claims are automated and auditable.
- Initial fraud checks actively block/flag suspicious behavior.