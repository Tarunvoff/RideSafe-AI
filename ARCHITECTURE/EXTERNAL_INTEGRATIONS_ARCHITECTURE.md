# Aegis Ecosystem: Authoritative External Integration Matrix
## Deterministic Ingestion. Cryptographic Settlement. Absolute Autonomy.

### Executive Overview
Unlike fragile fintech architectures that blindly trust third-party data layers, the **Production-Ready Aegis Platform** enforces a rigid doctrine of **Authoritative Infrastructure**. All core actuarial computations, dynamic premium stratifications, and heuristic fraud models are retained strictly on-premise. 

Our ecosystem interacts with external services exclusively for **Authoritative Data Ingestion** and **Gateway Execution**. We treat third-party endpoints neither as intelligence engines nor "integrations," but strictly as specialized **Data Oracles** and **Financial Pipeline Executors**. This Tier-1 architecture guarantees that operational basis risk is mathematically minimized, while our **Algorithmic Autonomy** remains entirely impervious to upstream outages, logic drift, or adversarial manipulation.

---

### Actuarial Data Sources (The Triggers)
The parametric settlement engine ingests granular, government-verified telemetry from authoritative civic oracles.

#### 1. OpenWeather (The Meteorological Oracle)
* **Ingestion Layer**: `ml-services/ml-insurance-service`
* **Forensic Rationale**: Utilized exclusively for high-fidelity, hyper-localized meteorological mapping. Instead of generalized regional weather assertions, we ingest exact precipitation volumes, wind velocity, and storm vector data required to trigger parametric clauses deterministically.
* **Injection Protocol**: 
  ```env
  OPENWEATHER_API_KEY=${SECRET_VAULT_OPENWEATHER}
  ```

#### 2. OpenAQ (The Atmospheric Authority)
* **Ingestion Layer**: `ml-services/h3-feature-service`
* **Forensic Rationale**: Engaged as the definitive, un-spoofable authority for regional PM2.5 and continuous Air Quality Index (AQI) telemetry. This provides an incorruptible, public-health-verified trigger for AQI/Hazardous-smog income loss modules.
* **Injection Protocol**: 
  ```env
  OPENAQ_API_KEY=${SECRET_VAULT_OPENAQ}
  ```

#### 3. Newsdata.io & TomTom (Civic Disruption & Flow)
* **Ingestion Layer**: `ml-services/grid-event-service`
* **Forensic Rationale**: Disruption underwriting demands immediate ground-truth verification of civil bandhs (strikes) or infrastructure closures. These pipelines execute **Real-Time Traffic Density Analytics** and civic incident alerting to authorize non-weather parametric claims with zero manual verification, entirely eliminating human bias.

---

### Financial & Geospacial Gateways (The Executors)

#### RazorpayX (Atomic Settlement Pipeline)
* **Execution Layer**: `backend/src/payments`
* **Architecture Rationale**: Operates as the terminal execution layer for verified parametric payouts. Settlements are driven by absolute **Deterministic Idempotency Keys** (generated via SHA-256 hashing of driver state). Financial execution is finalized strictly via **Cryptographic Webhook Validation**. This guarantees instant UPI disbursements with **100% ACID Compliance**.
* **Injection Protocol**: 
  ```env
  RAZORPAY_KEY_ID=${SECRET_VAULT_RZP_ID}
  ```

#### Uber H3 Hexagonal Grid (Resolution 8)
* **Execution Layer**: `ml-services/h3-feature-service`
* **Architecture Rationale**: Aegis completely discards the archaic, high-latency boundaries of traditional postal codes. By employing the H3 geometric index as our foundational spatial protocol, we slice operational zones into mathematically perfect, uniform hexagons. This yields an exact **O(1) Spatial Lookup Efficiency**, flawlessly correlating localized weather/disruption phenomena to raw driver GPS pings.

#### Twilio (Enforcement Gateway)
* **Execution Layer**: Platform Core (NestJS)
* **Architecture Rationale**: Provides the critical out-of-band communication enforcement for OTP/MFA verifications and un-spoofable settlement receipts, establishing a legally defensible audit trail.

---

### The "Fail-Closed" Resiliency Matrix

Tier-1 engineering mandates absolute determinism under degraded infrastructure states. Rather than processing claims with missing telemetry via default "success" mocks, Aegis strictly enforces a **Fail-Closed Circuit-Breaker** paradigm.

| Authoritative Source | Failure Modality (e.g., HTTP 5xx) | Mission-Critical Architectural Response |
| :--- | :--- | :--- |
| **Meteorological / AQI Oracles** | Upstream Endpoint Degradation | System probes internal Redis cache (max 60m threshold). If the anomaly window exceeds cache TTL, Aegis triggers the **INSUFFICIENT_DATA_STATE** circuit-breaker. Payouts are subjected to strict administrative hold. **No blind automated approvals.** |
| **Razorpay Gateways** | Settlement Timeout / 504 Error | Settlement payload persists securely serialized inside the transactional queue. System completely prohibits `CLAIM_SETTLED` mutation until an asynchronous webhook pingback unequivocally confirms ledger updates. |
| **TomTom / NewsData** | Upstream Latency Spike (>1500ms) | H3 density module enforces an asynchronous drop. Request execution is synchronously halted; localized triggers enter an `UNKNOWN` state to prevent false-positive disruption fraud. |
| **Twilio SMS Gateway** | Execution Drop / Dispatch Failure | Authentication pipeline assumes a **Hostile / Degraded Context**. System immediately halts token issuance, aborts financial state transitions, and fails-safe. |

---
**Integration Status**: *Secure, Locked, & Enforcing.*
*Aegis Ecosystem: Absolute Data Integrity. Cryptographic Execution.*
