# H3 Feature Service (FastAPI)

Aggregates real-time H3 features (weather, AQI, platform activity, civic alerts) and runs the full pipeline used for risk scoring and pricing.

## Pipeline Flow
1. Convert lat/lng to H3
2. Fetch real-time features (weather, AQI, civic, platform)
3. Build feature vector + quality signals
4. Call ml-insurance-service /risk-score
5. Call ml-insurance-service /pricing
6. Write zone_state to Redis

## Endpoints
### POST /pipeline
Request:
```json
{
  "lat": 12.9716,
  "lng": 77.5946,
  "Ew": 8000,
  "Ct": 0.6,
  "M": 0.1,
  "platform": "zepto"
}
```
Response includes Lf, premium, zone_state, and quality flags.

### POST /features
Request:
```json
{"h3_cell": "8860145b49fffff"}
```
Returns full feature vector and quality metadata.

## Strict Realtime Mode
Set STRICT_REALTIME=true to disallow fallbacks.
- Any missing feature or platform activity returns HTTP 424.
- ML risk/pricing failures return HTTP 503 (no Redis fallback).

## Env Vars
- STRICT_REALTIME (true/false)
- PLATFORM_API_URL, PLATFORM_TIMEOUT_SECONDS
- ML_INSURANCE_SERVICE_URL
- ML_TIMEOUT_SECONDS, PIPELINE_DEADLINE_SECONDS
- MIN_CONFIDENCE_SCORE, MAX_FALLBACK_RATIO
- REDIS_URL

## Run
```bash
cd ml-calcultion/h3-feature-service
pip install -r requirements.txt
$env:STRICT_REALTIME="true"  # optional
uvicorn main:app --host 0.0.0.0 --port 8004 --reload
```
