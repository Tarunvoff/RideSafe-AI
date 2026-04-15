# ML Insurance Service (FastAPI)

This service provides the risk score (Lf) and premium pricing models used by the H3 pipeline. It does **not** decide payouts; the backend enforces policy + HALTED rules.

## Service Ownership
- Owns calibrated model scoring for risk, pricing, fraud, and trigger support.
- Owns training artifacts in `data/` and runtime model selection/fallback behavior.
- Does not own policy lifecycle, payments, or payout idempotency.

## External Dependencies
- Redis for risk smoothing state.
- Python ML stack: XGBoost, LightGBM, scikit-learn, SHAP.
- FastAPI HTTP interface consumed by backend services.

## Failure Behavior
- If risk model loading/inference fails, service falls back to deterministic heuristic scoring and logs `scoring_path=fallback`.
- If fraud explainability (SHAP) fails, fraud score is still returned with model/rule reason.
- If Redis is unavailable, in-memory Lf smoothing is used for current process lifetime.

## Endpoints
### POST /risk-score
Calculates Loss Fraction (Lf) and risk_level.
Request:
```json
{
  "h3_cell": "89283082803ffff",
  "weather": {"rainfall": 0.5, "temperature": 32.0},
  "aqi": 150,
  "demand_ratio": 1.2,
  "historical_disruption_frequency": 0.2,
  "zone_volatility": 0.1,
  "avg_speed_kmh": 28.0,
  "active_riders": 14
}
```
Response:
```json
{
  "Lf": 0.63,
  "risk_level": "MEDIUM"
}
```

### POST /pricing
Calculates premium using Pr = Ew * 0.015 * Lf * Ct * (1 + M).
Request:
```json
{
  "Ew": 8000,
  "Lf": 0.4,
  "Ct": 0.6,
  "M": 0.1
}
```
Response:
```json
{
  "premium": 31.68
}
```

### POST /trigger
Returns an ML trigger decision. Backend flow ignores this for payouts and uses zone_state == HALTED.
Request:
```json
{
  "h3_cell": "89283082803ffff",
  "fraud_score": 0.2
}
```

## Config Constants
From config.py:
- ALPHA = 0.015
- MIN_PREMIUM = 15
- MAX_PREMIUM = 150
- TRIGGER_ZONE_HALT_STATE = "HALTED"

## Run
```bash
cd ml-calcultion/ml-insurance-service
pip install -r requirements.txt
python train_models.py
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```
