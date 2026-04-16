# 🌐 Zone State Resilience: The Ground-Truth Engine

The Grid Event Service is the definitive **State Machine** for Project Aegis. It transforms millions of raw telemetry vectors into a unified, hexagonal "Ground Truth" for every insurance decision.

## ⚙️ The H3 Res-8 State Machine
Every cell is autonomously transitioned across four critical states:
*   **🟢 NORMAL**: Standard actuarial equilibrium.
*   **🟡 SLOW**: High-congestion pressure; supply-demand imbalance detected.
*   **🔴 DANGEROUS**: Environmental volatility threshold exceeded (AQI/Heat Risk).
*   **🔥 HALTED**: The Parametric Trigger State. **Automatic Payouts Initialized.**

## 💠 High-Performance Architecture
*   **Kafka Stream Orchestration**: Subscribes to the `driver_telemetry` firehose.
*   **H3 Rolling Windows**: Implements sliding window aggregations to ensure state transitions are based on persistent signals, not transient noise.
*   **Redis Ground Truth**: Dispatches the finalized zone state to the global cache, ensuring 100% synchronization across the backend and ML microservices.

---
**Standard**: **ZERO-LATENCY SYNC** ⚡ | **Status**: **REAL-TIME OPERATIONAL**
