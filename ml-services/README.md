# Aegis-AI ML Microservices

This directory contains the real-time ML and signal aggregation services that power pricing, risk scoring, fraud features, and zone state. All location data is mapped to **Uber H3 (resolution 8)** and processed per cell.

## Service Registry
| Service | Port | Manifest | State |
| --- | --- | --- | --- |
| ml-insurance-service | 8000 | [ACTUARIAL_INTELLIGENCE.md](./ml-insurance-service/ACTUARIAL_INTELLIGENCE.md) | Stateless
| fraud-feature-service | 8002 | [ADVERSARIAL_FRAUD_DEFENSE.md](./fraud-feature-service/ADVERSARIAL_FRAUD_DEFENSE.md) | Reads/writes Redis (driver)
| grid-event-service | 8003 | [ZONE_STATE_ENGINE.md](./grid-event-service/ZONE_STATE_ENGINE.md) | Writes Redis (zone)
| h3-feature-service | 8004 | [GEOSPATIAL_FEATURE_PIPELINE.md](./h3-feature-service/GEOSPATIAL_FEATURE_PIPELINE.md) | Pipeline orchestration

## High-Level Flow
1. NestJS backend streams GPS to Kafka as H3 cells.
2. grid-event-service aggregates telemetry into zone_state and writes Redis.
3. h3-feature-service gathers live features and calls ml-insurance-service.
4. Backend uses zone_state == HALTED to trigger payouts.

## Run All Services
All manifests found within subdirectories contain specific port and env var configurations. For a central unified start, use the commands below.
```bash
# Activate venv
venv\Scripts\activate

# ML insurance (8000)
cd ml-insurance-service
uvicorn main:app --host 0.0.0.0 --port 8000 --reload

# Fraud features (8002)
cd ..\fraud-feature-service
uvicorn main:app --host 0.0.0.0 --port 8002 --reload

# Grid event service (8003)
cd ..\grid-event-service
$env:USE_REDIS="True"
uvicorn main:app --host 0.0.0.0 --port 8003 --reload

# H3 feature service (8004)
cd ..\h3-feature-service
$env:STRICT_REALTIME="true"  # optional
uvicorn main:app --host 0.0.0.0 --port 8004 --reload
```

## Strict Realtime Mode (H3 Feature Service)
- Set STRICT_REALTIME=true
- Any fallback feature returns 424
- ML risk/pricing failures return 503
