"""
Aegis Dynamic Audit: Performs forensic-level validation of ML artifacts.
Ensures that risk, pricing, and fraud models meet production-grade monotonic 
constraints and sensitivity scores.

For a deep dive into the system design, refer to ARCHITECTURE/SYSTEM_ARCHITECTURE.md 
and ARCHITECTURE/OVERALL_PROJECT_SYSTEM_VIEW.md.
"""
import joblib
import os
import pandas as pd
import numpy as np

# Path to the models
DATA_DIR = "data"
LOAD_SUCCESS = True

try:
    risk_artifact = joblib.load(os.path.join(DATA_DIR, "risk_xgb_models.pkl"))
    risk_model = risk_artifact["model"]
    risk_features = risk_artifact["feature_names"]
    
    price_model = joblib.load(os.path.join(DATA_DIR, "price_lgb.pkl"))
    
    fraud_if = joblib.load(os.path.join(DATA_DIR, "fraud_if.pkl"))
    
    fraud_artifact = joblib.load(os.path.join(DATA_DIR, "fraud_gb.pkl"))
    fraud_gb = fraud_artifact["model"]
    fraud_features = fraud_artifact["feature_names"]
except Exception as e:
    print(f"CRITICAL: Failed to load binary models: {e}")
    LOAD_SUCCESS = False

def ghost_test():
    print("=== GHOST IN THE MACHINE TEST ===")
    if not LOAD_SUCCESS: return

    # 1. Risk Model Ghost Test
    inputs = [
        [10.0, 120.0, 1.1, 14, 2, 0.4, 300],
        [40.0, 150.0, 1.5, 18, 5, 0.6, 100],
        [100.0, 400.0, 2.8, 8, 6, 0.9, 10]
    ]
    df_risk = pd.DataFrame(inputs, columns=risk_features)
    probs = risk_model.predict_proba(df_risk)[:, 1]
    print(f"Risk Outputs (A, B, C): {probs}")
    if len(set(probs)) < 3: print("FLAG: Risk model outputs non-unique! Potential constant output — verify training diversity.")

    # 2. Pricing Model Ghost Test
    # Features: ["weekly_earnings", "lf", "ct", "margin"]
    inputs = [
        [7200.0, 0.6, 0.6, 0.12],
        [15000.0, 0.8, 0.65, 0.14],
        [50000.0, 0.95, 0.8, 0.15]
    ]
    df_price = pd.DataFrame(inputs, columns=["weekly_earnings", "lf", "ct", "margin"])
    # Note: Model predicts log(premium)
    preds = np.exp(price_model.predict(df_price))
    print(f"Pricing Outputs (A, B, C): {preds}")
    if len(set(preds)) < 3: print("FLAG: Pricing model outputs non-unique! Potential constant output — verify training diversity.")

    # 3. Fraud GB Ghost Test
    inputs = [
        [30.0, 0.1, 0, 0.0, 1, 0, 0.95, 100, 18, 1, 5.5],
        [60.0, 0.3, 1, 1.5, 3, 1, 0.80, 500, 30, 2, 16.6],
        [110.0, 0.8, 1, 4.0, 10, 8, 0.50, 2000, 10, 5, 200.0]
    ]
    df_fraud = pd.DataFrame(inputs, columns=fraud_features)
    probs = fraud_gb.predict_proba(df_fraud)[:, 1]
    print(f"Fraud GB Outputs (A, B, C): {probs}")
    if len(set(probs)) < 3: print("FLAG: Fraud GB outputs non-unique! Potential constant output — verify training diversity.")

def sensitivity_probe():
    print("\n=== SENSITIVITY & LOGIC PROBE ===")
    if not LOAD_SUCCESS: return

    # 1. Risk: Rainfall 10 -> 200
    base = [[10.0, 120.0, 1.1, 14, 2, 0.4, 300]]
    high = [[200.0, 120.0, 1.1, 14, 2, 0.4, 300]]
    p_base = risk_model.predict_proba(pd.DataFrame(base, columns=risk_features))[0][1]
    p_high = risk_model.predict_proba(pd.DataFrame(high, columns=risk_features))[0][1]
    print(f"Risk Sensitivity (Rain 10 -> 200): {p_base:.4f} -> {p_high:.4f}")
    if p_high <= p_base: print("FLAG: Monotonic constraints for rain BROKEN.")

    # 2. Pricing: Earnings + 1000
    base = [[8000.0, 0.6, 0.6, 0.12]]
    plus = [[9000.0, 0.6, 0.6, 0.12]]
    v_base = np.exp(price_model.predict(pd.DataFrame(base, columns=["weekly_earnings", "lf", "ct", "margin"])))[0]
    v_plus = np.exp(price_model.predict(pd.DataFrame(plus, columns=["weekly_earnings", "lf", "ct", "margin"])))[0]
    print(f"Pricing Sensitivity (8k -> 9k): {v_base:.2f} -> {v_plus:.2f}")
    if v_plus <= v_base: print("FLAG: Pricing model failed to respond to earnings increase.")

    # 3. Fraud: Teleport
    # features: speed, claims_rate, mismatch, velocity_z, claims_filed, claims_rejected, h3, dist, t, shared, ratio
    # Teleport ratio: 50/1 = 50.0 (Extreme)
    teleport = [[120.0, 0.0, 1.0, 5.0, 0.0, 0.0, 0.5, 1000.0, 10.0, 1.0, 100.0]]
    p_teleport = fraud_gb.predict_proba(pd.DataFrame(teleport, columns=fraud_features))[0][1]
    print(f"Fraud Teleport Probe Score: {p_teleport:.4f}")
    if p_teleport < 0.90: print("FLAG: Fraud model failed to detect teleport spike (>0.90).")

if __name__ == "__main__":
    ghost_test()
    sensitivity_probe()
