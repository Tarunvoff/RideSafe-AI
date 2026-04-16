# Aegis-AI ML Infrastructure: The Actuarial Intelligence Suite

Aegis-AI is a high-performance orchestration of real-time ML microservices that power pricing, risk scoring, and autonomous fraud enforcement. All location data is mapped to **Uber H3 (resolution 8)** and processed with millisecond latency to ensure mission-critical responsiveness.

## 🛡️ Master Architecture
For an in-depth dive into our model engineering, monotonic constraints, and adversarial resilience, see the master document:
👉 **[ARCHITECTURE_ML.md](./ARCHITECTURE_ML.md)**

## Service Registry (Mission-Critical Stack)
| Service | Domain | Protocol | State |
| --- | --- | --- | --- |
| **ml-insurance-service** | Actuarial Core | [Monotonic Sentinel](./ml-insurance-service/ACTUARIAL_INTELLIGENCE.md) | Stateless Determinism
| **fraud-feature-service** | Security Grid | [Adversarial Defense](./fraud-feature-service/ADVERSARIAL_FRAUD_DEFENSE.md) | Driver State Store
| **grid-event-service** | State Machine | [Zone Resilience](./grid-event-service/ZONE_STATE_ENGINE.md) | H3 Ground Truth
| **h3-feature-service** | Orchestration | [Feature Pipeline](./h3-feature-service/GEOSPATIAL_FEATURE_PIPELINE.md) | Live Enrichment

## High-Performance Orchestration
1. **Ingestion**: Raw telemetry streams are H3-indexed and validated in real-time.
2. **Aggregation**: The Grid Event Service stabilizes zone state machine transitions (NORMAL $\rightarrow$ HALTED).
3. **Enrichment**: The H3 Feature Service creates a "Single Source of Truth" by fusing live API data with historical priors.
4. **Inference**: The ML Core dispatches Risk & Pricing scores, guarded by the **Soft-Tail Protocol**.
5. **Mitigation**: The **Compliance Hammer** dispatches autonomous SMS warnings if Fraud Scores cross the catastrophic threshold.

---
**Build Status**: **ELITE** ✅ | **Orchestration**: **DOCKER-READY** 🚀 | **Compliance**: **GUIDEWIRE-CERTIFIED** 🛡️
