# Geospatial Feature Pipeline & Orchestrator

The orchestrator that bridges the gap between raw external data (IMD, CPCB, Open-Meteo) and the ML models.

## Pipeline Flow
1. **Poll External APIs**: Fetches live Rainfall, AQI, and News alerts.
2. **Context Enrichment**: Map-reduces GPS pings to H3-indexed feature vectors.
3. **ML Inference**: Calls `ml-insurance-service` to get fresh risk scores.
4. **Broadcast**: Publishes updated zone states to Kafka and Redis.

## Fallback Logic
- **Historical Prior**: If an API (e.g., IMD) goes down, the service pulls historical seasonal averages for that H3 location.
- **Strict Mode**: Can be toggled to reject inferences if live data is stale.

## Running the Service
```bash
$env:STRICT_REALTIME="true"
uvicorn main:app --port 8004
```
