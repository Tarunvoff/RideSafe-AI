# RideSafe-AI ML Microservices

This directory contains the real-time ML and signal aggregation services that power pricing, risk scoring, fraud features, and zone state. All location data is mapped to **Uber H3 (resolution 8)** and processed per cell.

## Service Registry
| Service | Port | Purpose | State |
| --- | --- | --- | --- |
| ml-insurance-service | 8000 | Risk score + pricing models | Stateless
| fraud-feature-service | 8002 | Fraud feature extraction | Reads/writes Redis (driver state)
| grid_event_service | 8003 | Kafka consumer that computes zone_state | Writes Redis (zone)
| h3-feature-service | 8004 | Feature aggregation + pipeline orchestration | Reads Redis; writes zone

## High-Level Flow
1. NestJS backend streams GPS to Kafka as H3 cells.
2. grid_event_service aggregates telemetry into zone_state and writes Redis.
3. h3-feature-service gathers live features and calls ml-insurance-service.
4. Backend uses zone_state == HALTED to trigger payouts.

## Prerequisites
- Kafka on port 9092
- Redis on port 6379
- Python venv activated

## Run All Services (manual)
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
cd ..\grid_event_service
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
