"""
train_models.py — Train and save risk_model.pkl and fraud_model.pkl
Run once from the ml_microservice directory:
    python train_models.py
"""
import os
import sys
import numpy as np
import pandas as pd
import joblib
from sklearn.ensemble import RandomForestClassifier, IsolationForest

MODELS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "models")
os.makedirs(MODELS_DIR, exist_ok=True)

# ── Risk Model ────────────────────────────────────────────────────────────────
print("Training risk_model (RandomForestClassifier)...")

np.random.seed(42)
n = 5000

rainfall        = np.random.exponential(scale=10, size=n)
rainfall_3h_avg = rainfall * np.random.uniform(0.7, 0.9, size=n)
temperature     = np.random.normal(31, 5, size=n)
aqi             = np.random.normal(150, 80, size=n).clip(30, 500)
aqi_trend       = np.random.uniform(-20, 20, size=n)
zone_risk_score = np.random.uniform(0, 1, size=n)
season          = np.random.randint(1, 5, size=n)
hour_of_day     = np.random.randint(0, 24, size=n)
day_of_week     = np.random.randint(0, 7, size=n)
month           = np.random.randint(1, 13, size=n)

# Label: 1 = disruption likely
label = (
    (rainfall > 35) |
    (temperature > 42) |
    (aqi > 300) |
    ((zone_risk_score > 0.7) & (rainfall > 15))
).astype(int)

X_risk = pd.DataFrame({
    "rainfall_last_hour":  rainfall,
    "rainfall_3hr_avg":    rainfall_3h_avg,
    "temperature_current": temperature,
    "aqi_current":         aqi,
    "aqi_trend":           aqi_trend,
    "zone_risk_score":     zone_risk_score,
    "season":              season,
    "hour_of_day":         hour_of_day,
    "day_of_week":         day_of_week,
    "month":               month,
})

risk_model = RandomForestClassifier(n_estimators=100, max_depth=10, random_state=42)
risk_model.fit(X_risk, label)
joblib.dump(risk_model, os.path.join(MODELS_DIR, "risk_model.pkl"))
print(f"  ✅ Saved → {MODELS_DIR}/risk_model.pkl  (trained on {n} samples)")

# ── Fraud Model ───────────────────────────────────────────────────────────────
print("Training fraud_model (IsolationForest)...")

gps_distance      = np.random.uniform(0, 10, size=n)
claim_frequency   = np.random.poisson(1.5, size=n)
delivery_activity = np.random.randint(1, 20, size=n)
zone_claim_density= np.random.uniform(0, 1, size=n)
device_consistency= np.random.choice([0, 1], size=n, p=[0.05, 0.95])

X_fraud = pd.DataFrame({
    "gps_distance_from_zone": gps_distance,
    "claim_frequency":        claim_frequency,
    "delivery_activity":      delivery_activity,
    "zone_claim_density":     zone_claim_density,
    "device_consistency":     device_consistency,
})

fraud_model = IsolationForest(contamination=0.05, random_state=42)
fraud_model.fit(X_fraud)
joblib.dump(fraud_model, os.path.join(MODELS_DIR, "fraud_model.pkl"))
print(f"  ✅ Saved → {MODELS_DIR}/fraud_model.pkl  (trained on {n} samples)")

print("\n🎉 All models trained and saved successfully.")
