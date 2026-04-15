# Grid Event Service (FastAPI)

Consumes Kafka telemetry, aggregates per-H3 activity, and writes zone state to Redis.

## Responsibilities
- Consume driver_telemetry from Kafka
- Aggregate pings per H3 cell in time windows
- Compute Lf and zone_state
- Write zone:{h3_cell} to Redis (TTL)

## Kafka Topics
- driver_telemetry (input)
- zone_state_updates (optional output)

## Env Vars
From config.py:
- KAFKA_BOOTSTRAP_SERVERS
- KAFKA_CONSUMER_GROUP
- KAFKA_TOPIC_TELEMETRY
- USE_REDIS, REDIS_URL
- ZONE_KEY_TTL_SECONDS
- ML_SERVICE_URL, ML_TIMEOUT

## Run
```bash
cd ml-calcultion/grid_event_service
pip install -r requirements.txt
$env:USE_REDIS="True"
uvicorn main:app --host 0.0.0.0 --port 8003 --reload
```
