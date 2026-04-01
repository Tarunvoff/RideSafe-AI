# Fraud Feature Service (FastAPI)

Generates fraud feature vectors from live telemetry for the NestJS fraud analyzer.

## Endpoint
### POST /fraud-features
Request:
```json
{
  "user_id": "drv_...",
  "device_id": "device_123",
  "upi_id": "upi_123",
  "lat": 12.9716,
  "lng": 77.5946,
  "timestamp": 1712010000,
  "claim_amount": 0,
  "event_type": "GPS_PING"
}
```
Response includes:
- identity: account age, device uniqueness, switch frequency
- location: gps speed, cell distance, zone consistency
- behavior: claims_last_30d, trigger_frequency, earnings deviation
- meta: h3_cell, timestamp, burst flags

## Storage Mode
- USE_REDIS=false uses in-memory history
- USE_REDIS=true reads/writes Redis

## Env Vars
From config.py:
- USE_REDIS, REDIS_URL
- USER_CACHE_TTL_SECONDS
- H3_RESOLUTION
- Feature window settings (CLAIMS_WINDOW_DAYS, DEVICE_SWITCH_WINDOW_DAYS)

## Run
```bash
cd ml-calcultion/fraud-feature-service
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8002 --reload
```
