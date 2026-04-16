# 🛰️ Geospatial Orchestration: The Feature Pipeline

The H3-Feature Service is the mission-critical orchestrator that fuses raw external API data with real-time grid telemetry to fuel the **Aegis AI Core**.

## 🌊 Data Fusion Pipeline
1. **Multi-Source Polling**: Orchestrates parallel fetches from IMD, CPCB, and Open-Meteo.
2. **Hex-Enrichment**: Map-reduces disparate data points into high-density H3-indexed feature vectors.
3. **ML Synchronization**: Dispatches the enriched vectors to the `ml-insurance-service` for live risk/pricing inference.
4. **Global Broadcast**: Updates the Redis State Store to propagate new scores across the ecosystem.

## 🛠️ Fail-Safe Engineering (Deterministic Priors)
*   **Historical Fallback**: If an external data source (API) dispatches a failure, the pipeline autonomously selects **Historical Seasonality Priors** to maintain continuity.
*   **Strict Mode Persistence**: When `STRICT_REALTIME=true`, the orchestrator rejects any inference based on stale data, ensuring 100% data integrity for high-stakes payouts.

---
**Protocol**: **Cloud-Native Ingestion** ☁️ | **Status**: **PIPELINE OPERATIONAL**
