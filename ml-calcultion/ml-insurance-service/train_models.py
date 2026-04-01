import os
import joblib
import numpy as np
import xgboost as xgb
import lightgbm as lgb
from sklearn.ensemble import IsolationForest, GradientBoostingClassifier

DATA_DIR = os.path.join(os.path.dirname(__file__), 'data')
ENABLE_SYNTHETIC_TRAINING = os.getenv("ENABLE_SYNTHETIC_TRAINING", "false").lower() == "true"

def train_and_save():
    os.makedirs(DATA_DIR, exist_ok=True)
    
    if not ENABLE_SYNTHETIC_TRAINING:
        print("Synthetic training disabled. Risk and pricing use heuristic models in runtime.")
    else:
        np.random.seed(42)

        # 1. XGBoost Risk Model (synthetic) — disabled by default
        print("Training XGBoost Risk Model (synthetic)...")
        X_risk = np.random.rand(1000, 6)
        y_risk_1 = np.random.randint(0, 2, 1000)
        y_risk_2 = np.random.randint(0, 2, 1000)
        y_risk_3 = np.random.randint(0, 2, 1000)
        model_xgb_rain = xgb.XGBClassifier(n_estimators=10, random_state=42)
        model_xgb_rain.fit(X_risk, y_risk_1)
        model_xgb_aqi = xgb.XGBClassifier(n_estimators=10, random_state=42)
        model_xgb_aqi.fit(X_risk, y_risk_2)
        model_xgb_temp = xgb.XGBClassifier(n_estimators=10, random_state=42)
        model_xgb_temp.fit(X_risk, y_risk_3)
        joblib.dump({"rain": model_xgb_rain, "aqi": model_xgb_aqi, "temp": model_xgb_temp}, os.path.join(DATA_DIR, 'risk_xgb_models.pkl'))

        # 2. LightGBM Pricing Model (synthetic) — disabled by default
        print("Training LightGBM Pricing Model (synthetic)...")
        X_price = np.random.rand(1000, 4) # Ew, Lf, Ct, M_base
        y_price = np.random.uniform(15, 150, 1000)
        model_lgb = lgb.LGBMRegressor(n_estimators=10, random_state=42)
        model_lgb.fit(X_price, y_price)
        joblib.dump(model_lgb, os.path.join(DATA_DIR, 'price_lgb.pkl'))

    # 3. Isolation Forest (Anomaly Detection for Fraud)
    # Features MUST match fraud_service.py exactly:
    #   [speed, claims_rate, mismatch, velocity_z]
    print("Training IsolationForest Anomaly Model...")

    n_normal, n_fraud = 900, 100

    # Normal users: low speed, low rejection rate, no mismatch
    speed_normal      = np.random.uniform(0, 60, n_normal)          # km/h
    claims_rate_norm  = np.random.uniform(0, 0.2, n_normal)          # <20% rejection
    mismatch_normal   = np.zeros(n_normal)                            # no mismatch
    velocity_z_normal = (speed_normal - 60.0) / 20.0                  # z-score

    # Fraud users: high speed, high rejection rate, mismatch
    speed_fraud       = np.random.uniform(100, 200, n_fraud)         # GPS spoof
    claims_rate_fraud = np.random.uniform(0.5, 1.0, n_fraud)          # >50% rejection
    mismatch_fraud    = np.ones(n_fraud)                               # mismatch
    velocity_z_fraud  = (speed_fraud - 60.0) / 20.0                   # z-score

    X_anomaly = np.vstack([
        np.column_stack([speed_normal, claims_rate_norm, mismatch_normal, velocity_z_normal]),
        np.column_stack([speed_fraud, claims_rate_fraud, mismatch_fraud, velocity_z_fraud]),
    ])

    model_if = IsolationForest(n_estimators=100, contamination=0.1, random_state=42)
    model_if.fit(X_anomaly)
    joblib.dump(model_if, os.path.join(DATA_DIR, 'fraud_if.pkl'))

    # 4. GradientBoosting Classifier (Supervised Fraud)
    # Features: claims_filed, claims_rejected, device_mismatch
    print("Training GradientBoostingClassifier Fraud Model...")
    X_fraud = np.zeros((1000, 3))
    y_fraud = np.zeros(1000)
    
    # Normal users: few claims, no rejections, no mismatch
    X_fraud[:800, 0] = np.random.randint(0, 3, 800)
    X_fraud[:800, 1] = 0
    X_fraud[:800, 2] = 0
    
    # Fraud users: high claims, high rejections, device mismatch
    X_fraud[800:, 0] = np.random.randint(3, 10, 200)
    X_fraud[800:, 1] = np.random.randint(1, 6, 200)
    X_fraud[800:, 2] = 1
    y_fraud[800:] = 1
    
    model_gb = GradientBoostingClassifier(n_estimators=10, random_state=42)
    model_gb.fit(X_fraud, y_fraud)
    joblib.dump(model_gb, os.path.join(DATA_DIR, 'fraud_gb.pkl'))

    print("All models trained and saved to data/")

if __name__ == '__main__':
    train_and_save()
