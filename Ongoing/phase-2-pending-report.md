# Phase 2 Requirements & Codebase Analysis

## 1. Current State Overview
Based on a comprehensive review of the codebase (including backend, mobile frontend, ML pipeline, and the recent Surgical Audit Report), the current state of Phase 1 and early Phase 2 components is strong. A significant portion of the platform's core infrastructure is already built, functional, and aligns with the Phase 2 goals:

*   **Mock Verification:** Integrations use production-level ML models (`fraud_if.pkl`, `fraud_gb.pkl`). Mocks are limited to fallback scenarios (traffic, weather) or explicit simulations lacking B2B APIs (qcommerce).
*   **Dynamic Premium Calculation:** Successfully implemented via the `pricing_service.py` using live parameters (Earnings, Frequency, Confidence) and zone-based demand/volatility multipliers.
*   **Intelligent Fraud Detection:** Anomalies are evaluated using Isolation Forests and Gradient Boosting models, enforcing a configurable threshold (0.7) to block fraudulent payouts.
*   **Parametric Automation & Triggers:** The orchestrator correctly reads zone risk telemetry (via Redis) to manage state. Disruptions (e.g., `FLOODED`, `TOXIC_AQI`, `GRIDLOCK`) are monitored in real-time, leveraging a robust Payout Idempotency guarantee to prevent double-payments.
*   **Data Ingestion Layer:** Kafka correctly handles high-throughput GPS/telemetry to compute rider counts and speed averages.

## 2. Pending Phase-2 Requirements
While the backend processing flows exist, several structural elements to fulfill the literal Phase-2 execution goals are still pending or incomplete. 

### Frontend/UI
*   **Feature/Task Name:** KYC Rejection Graceful Handling
*   **Context:** The backend strictly checks `kycProfile.status` before generating an insurance policy, but the frontend lacks specific error state routing for these rejections (currently falling back to a generic error message).
*   **Implementation Details:** Introduce an explicit UI flow intercept in the mobile app `ClaimsScreen` or enrollment module, parsing the `ForbiddenException` from the backend to display "Complete KYC first."

### Backend/API
*   **Feature/Task Name:** Database Transaction Wrapping for Razorpay
*   **Context:** Currently, if a Razorpay payment succeeds but the `Policy` fails to insert into the database, the user loses their money with no policy record. 
*   **Implementation Details:** Refactor `payments.service.ts` to wrap the order update and policy creation steps heavily within a single `$transaction` block.
*   **Feature/Task Name:** Uninsured Driver Filtering in Orchestrator
*   **Context:** While triggers execute gracefully, real-time loops process users who do not possess active policies, incorrectly creating log noise ("payout=0, decision=REJECT").
*   **Implementation Details:** Append a strict skipping mechanism early inside the `claim-orchestrator.service.ts` `processInsurance()` return iteration to save computational overhead on millions of uninsured drivers.

### Database/Schema & DevOps
*   **Feature/Task Name:** Leverage or Deprecate TimescaleDB
*   **Context:** Telemetry logs populate into `zone_telemetry_logs` but are never actively queried for moving calculations.
*   **Implementation Details:** For Phase 2 predictive requirements, integrate historic moving averages using Postgres Timescale aggregation, or simplify infrastructure by dropping the timescale container from `docker-compose.yml`.
*   **Feature/Task Name:** Redis Volatile State Persistence
*   **Context:** Redis holds operational triggers, but resets wipe all map and pipeline states permanently.
*   **Implementation Details:** Update Docker configurations to mount redis data volumes and enable AOF (Append Only File) to ensure grid state persists across deployment downtimes.

### Testing/Submission
*   **Feature/Task Name:** End-to-End Payout Simulation Recording
*   **Context:** The final deliverable artifact for phase 2 requires a publicly accessible 2-minute demo. The codebase lacks an explicit script or simulated data runner dedicated to generating this video easily.
*   **Implementation Details:** Build a dummy script or robust seed payload that forces a `FLOODED` H3 trigger to successfully navigate the zero-touch claim lifecycle within ~60 seconds to satisfy the demo requirement.

## 3. Identified Technical Debt
Before engaging further on features, address the following debt lines:
*   **API Atomicity:** The backend Payment-to-Policy schema lacks robust rollback controls. Essential `try-catch` / Transaction API updates are required in Nest.
*   **Service Layer Logging Noise:** The orchestrator currently wastes logging execution on drivers devoid of active policies.
*   **In-Memory Reliance:** Redis data loss currently acts as a pseudo "soft-delete" on active disaster triggers.
*   **Kafka DLQ Handling:** `KafkaDLQ` table exists in Prisma but needs periodic retry verification pipelines to ensure dropped telemetry messages are eventually replayed.

## 4. Phase-2 Execution Roadmap
1.  **High Priority Engine Fixes (Day 1):** Wrap `payment.service.ts` policy insertions within a Prisma `$transaction`. Fix `claim-orchestrator.service.ts` to silence non-policy driver loops.
2.  **DevOps Adjustments (Day 1):** Apply persistent state tags to the Redis docker compose config. Resolve TimescaleDB inclusion.
3.  **Frontend Enhancements (Day 2):** Parse and display accurate KYC warnings in UI endpoints to enforce explicit Phase-2 user flows.
4.  **Integration Stabilization (Day 3-4):** Validate real-world fallbacks (Open Meteo + Traffic) to ensure the 3 default pipeline events correctly stream into Kafka without breaking when external API limits are exceeded.
5.  **Recording & Delivery (Day 5):** Rehearse and capture the 2-minute required demo of the Happy-Path flow traversing Onboarding → Live Map Risk → Trigger Event → Auto Payout.
