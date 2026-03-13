from fastapi import FastAPI, HTTPException, Depends
from pydantic import BaseModel
import joblib
import pandas as pd

app = FastAPI(title="GigShield API", version="1.0.0")

# Input Schemas
class RiskPredictionRequest(BaseModel):
    zone_id: int
    current_temperature: float
    current_rainfall: float
    current_aqi: float
    time_of_day_hours: int
    day_of_week: int

class PremiumPredictionRequest(BaseModel):
    rider_id: int
    zone_risk_score: float
    historical_claims_count: int

class FraudScoreRequest(BaseModel):
    claim_id: int
    rider_claim_frequency: int
    activity_count_24h: int
    payout_distance_km: float

class TriggerCheckRequest(BaseModel):
    zone_id: int
    # Data is usually read from DB, but accepting manual trigger values for demo
    temperature: float
    rainfall: float
    aqi: float

class CreateClaimRequest(BaseModel):
    rider_id: int
    trigger_id: int
    policy_id: int

import os

MODELS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), '../models')

# Force reload of ML Models dynamically if available per request
def get_risk_model():
    model_path = os.path.join(MODELS_DIR, "risk_model.pkl")
    if not os.path.exists(model_path):
        return None
    try:
        return joblib.load(model_path)
    except Exception as e:
        print(f"[WARN] Could not load risk_model.pkl: {e}")
        return None

def get_fraud_model():
    model_path = os.path.join(MODELS_DIR, "fraud_model.pkl")
    if not os.path.exists(model_path):
        return None
    try:
        return joblib.load(model_path)
    except Exception as e:
        print(f"[WARN] Could not load fraud_model.pkl: {e}")
        return None

@app.get("/health")
def health_check():
    return {"status": "ok"}

@app.post("/predict-premium", tags=["ML Predictions"])
def predict_premium(request: PremiumPredictionRequest):
    """Returns weekly premium based on risk score."""
    # Simplified logic: Base Premium + Risk Adjustment
    base_premium = 50.0 # e.g. INR
    risk_factor = request.zone_risk_score * 0.1
    claim_penalty = request.historical_claims_count * 5.0
    
    final_premium = round(base_premium + risk_factor + claim_penalty, 2)
    return {"premium_amount": final_premium, "currency": "INR"}

@app.post("/predict-risk", tags=["ML Predictions"])
def predict_risk(request: RiskPredictionRequest):
    """Returns probability of disruption for a zone."""
    feature_df = pd.DataFrame({
        'rainfall_last_hour': [request.current_rainfall],
        'rainfall_3hr_avg': [request.current_rainfall * 0.8],
        'temperature_current': [request.current_temperature],
        'aqi_current': [request.current_aqi],
        'aqi_trend': [0.0],
        'zone_risk_score': [0.5],
        'season': [1],
        'hour_of_day': [request.time_of_day_hours],
        'day_of_week': [request.day_of_week],
        'month': [7]
    })
    model = get_risk_model()
    if model:
        probability = float(model.predict_proba(feature_df)[0][1])
    else:
        probability = 0.65 # Dummy value
    if probability > 0.6:
        level = "HIGH"
    elif probability > 0.2:
        level = "MODERATE"
    else:
        level = "LOW"
        
    return {"disruption_probability": probability, "risk_level": level}

@app.post("/fraud-score", tags=["ML Predictions"])
def fraud_score(request: FraudScoreRequest):
    """Returns fraud score for a claim using Isolation Forest."""
    feature_df = pd.DataFrame({
        'gps_distance_from_zone': [request.payout_distance_km],
        'claim_frequency': [request.rider_claim_frequency],
        'delivery_activity': [request.activity_count_24h],
        'zone_claim_density': [0.5],
        'device_consistency': [1.0]
    })
    model = get_fraud_model()
    if model:
        # IF returns -1 for anomalies, 1 for normal
        prediction = model.predict(feature_df)[0]
        is_fraud = bool(prediction == -1)
        score = float(model.score_samples(feature_df)[0])
        mapped_fraud_score = max(0, min(100, (score + 0.5) * -200))
    else:
         is_fraud = request.payout_distance_km > 20.0 or request.rider_claim_frequency > 5
         mapped_fraud_score = 90.0 if is_fraud else 10.0
    return {"claim_id": request.claim_id, "is_fraudulent": is_fraud, "fraud_score": mapped_fraud_score}

@app.post("/trigger-check", tags=["Operations"])
def trigger_check(request: TriggerCheckRequest):
    """Checks if environmental thresholds are met for a quick API run."""
    trigger_fired = False
    reasons = []

    if request.rainfall >= 50.0:  # mm/h
        trigger_fired = True
        reasons.append("HIGH_RAINFALL")
    if request.temperature >= 40.0:
        trigger_fired = True
        reasons.append("EXTREME_HEAT")
    if request.aqi >= 400.0:
        trigger_fired = True
        reasons.append("TOXIC_AQI")

    return {
        "zone_id": request.zone_id,
        "trigger_fired": trigger_fired,
        "reasons": reasons
    }

@app.post("/create-claim", tags=["Operations"])
def create_claim(request: CreateClaimRequest):
    """Creates claim when trigger fires."""
    # This would execute a DB insert on Claim table
    return {
        "status": "success",
        "claim_id": 999,
        "message": f"Claim generated for rider {request.rider_id} against trigger {request.trigger_id}"
    }

@app.get("/metrics/summary", tags=["Metrics"])
def get_metrics_summary():
    """Returns a summary of core system metrics."""
    return {
        "active_zones": 12,
        "total_claims_processed": 1543,
        "high_risk_zones": 3,
        "system_status": "healthy"
    }

@app.get("/metrics/trends", tags=["Metrics"])
def get_metrics_trends(hours: int = 24):
    """Returns trend data over the specified hours."""
    # Mock trend data
    return {
        "hours": hours,
        "trends": [
            {"timestamp": f"T-{i}h", "avg_risk_score": round(0.4 + (i % 5)*0.1, 2), "claims_volume": 10 + i * 2}
            for i in range(hours, 0, -1)
        ]
    }

@app.get("/metrics/heatmap", tags=["Metrics"])
def get_metrics_heatmap():
    """Returns data for spatial heatmap rendering."""
    return {
        "heatmap_data": [
            {"zone_id": 1, "zone_name": "Koramangala", "lat": 12.9352, "lon": 77.6245, "risk_intensity": 0.8},
            {"zone_id": 2, "zone_name": "Indiranagar", "lat": 12.9784, "lon": 77.6408, "risk_intensity": 0.4},
            {"zone_id": 3, "zone_name": "Whitefield", "lat": 12.9698, "lon": 77.7499, "risk_intensity": 0.2}
        ]
    }

@app.get("/performance", tags=["Metrics"])
def get_performance():
    """Returns ML model and API performance metrics."""
    return {
        "model_latency_ms": {"fraud_model": 45, "risk_model": 32},
        "api_uptime_percent": 99.98,
        "throughput_req_sec": 120,
        "error_rate_percent": 0.01
    }

# if __name__ == "__main__":
#     import uvicorn
#     uvicorn.run(app, host="0.0.0.0", port=8000)
