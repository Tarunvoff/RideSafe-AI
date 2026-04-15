# Zone State & Grid Aggregation Engine

This service consumes raw telemetry streams and translates them into a real-time Hexagonal Grid State (Uber H3 Res 8).

## The State Machine
Each H3 cell exists in one of four states:
- **🟢 NORMAL**: Standard operation.
- **🟡 SLOW**: High demand vs. low rider supply.
- **🔴 DANGEROUS**: High environmental risk (AQI/Heat).
- **🔥 HALTED**: Parametric trigger state. Automatic payouts enabled.

## Responsibilities
- **Kafka Consumption**: Subscribes to `driver_telemetry` and `zone_state_updates`.
- **H3 Rolling Windows**: Windowed aggregation of pings per cell (60s default).
- **Redis Sync**: Maintains the global "Ground Truth" of zone states for all other microservices.

## Running the Service
```bash
$env:USE_REDIS="True"
uvicorn main:app --port 8003
```
