
import numpy as np
import joblib
import os
import pandas as pd
from sklearn.metrics import roc_auc_score, mean_absolute_percentage_error
from sklearn.model_selection import train_test_split

# Constants
MEDIAN_WEEKLY_EARNINGS_INR = 7200.0
EARNINGS_LOG_SIGMA = 0.38
FRAUD_BASE_RATE = 0.08
NORMAL_SPEED_MEAN_KMH = 28.0
NORMAL_SPEED_STD_KMH = 9.0

# Feature name definitions
RISK_FEATURES = ["rainfall_mm", "aqi_index", "demand_factor", "hour_of_day", "day_of_week", "zone_historical_risk", "driver_tenure_days"]
FRAUD_FEATURES = ["speed_kmh", "claims_rejection_rate", "device_mismatch", "velocity_z", "claims_filed", "claims_rejected", "h3_zone_consistency", "delta_distance_m", "delta_t_s", "shared_driver_count_24h", "teleport_ratio"]
PRICE_FEATURES = ["weekly_earnings", "lf", "ct", "margin"]

def _clip(arr: np.ndarray, lo: float, hi: float) -> np.ndarray:
    return np.minimum(np.maximum(arr, lo), hi)

def _apply_jitter(df: pd.DataFrame, noise_level: float = 0.05) -> pd.DataFrame:
    """Provision synthetic sensor jitter with 5% Gaussian noise."""
    jitter = np.random.normal(0, noise_level, df.shape)
    return df * (1 + jitter)

# --- Standard Generators (Randomly Shifted distributions) ---
def _generate_standard_risk(n_samples: int = 10000):
    rng = np.random.default_rng(2025)
    rainfall = _clip(rng.gamma(shape=2.3, scale=8.2, size=n_samples), 0, 220)
    aqi = _clip(rng.normal(loc=125, scale=50, size=n_samples), 20, 450)
    demand_factor = _clip(rng.normal(loc=1.15, scale=0.2, size=n_samples), 0.4, 2.8)
    hour_of_day = rng.integers(0, 24, size=n_samples)
    day_of_week = rng.integers(0, 7, size=n_samples)
    zone_historical_risk = _clip(rng.beta(a=2.4, b=4.7, size=n_samples), 0, 1)
    driver_tenure_days = _clip(rng.lognormal(mean=np.log(210), sigma=0.85, size=n_samples), 1, 3650)
    risk_linear = (
        0.85 * (rainfall / 20.0) + 0.45 * (aqi / 100.0) + 1.25 * (demand_factor - 1.0)
        + 1.15 * zone_historical_risk - 2.8
    )
    y = (rng.random(n_samples) < (1.0 / (1.0 + np.exp(-risk_linear)))).astype(int)
    data = np.column_stack([rainfall, aqi, demand_factor, hour_of_day, day_of_week, zone_historical_risk, driver_tenure_days])
    return pd.DataFrame(data, columns=RISK_FEATURES), y

def _generate_standard_fraud(n_samples: int = 5000):
    rng = np.random.default_rng(123)
    speeds = _clip(rng.normal(28.0, 8.0, n_samples), 0, 180)
    claims_filed = rng.poisson(lam=0.5, size=n_samples)
    claims_rejected = np.minimum(claims_filed, rng.binomial(np.maximum(claims_filed, 1), 0.15))
    mismatch = rng.binomial(1, 0.04, size=n_samples)
    h3_consistency = _clip(rng.normal(0.9, 0.1, n_samples), 0, 1)
    shared_drivers = np.maximum(1, rng.poisson(lam=1.5, size=n_samples))
    
    # Standard fraud signals (teleportation)
    fraud = np.zeros(n_samples, dtype=int)
    fraud_idx = rng.choice(n_samples, int(n_samples*0.08), replace=False)
    fraud[fraud_idx] = 1
    
    delta_dist = np.maximum(20.0, speeds * 3.0)
    delta_t = np.maximum(1.0, 180.0 / np.maximum(speeds, 1.0))
    for idx in fraud_idx:
        delta_dist[idx] = rng.uniform(200, 600)
        delta_t[idx] = rng.uniform(1, 10)
        
    teleport = delta_dist / delta_t
    data = np.column_stack([
        speeds, claims_rejected / np.maximum(claims_filed, 1), mismatch.astype(float),
        (speeds-28)/8, claims_filed.astype(float), claims_rejected.astype(float),
        h3_consistency, delta_dist, delta_t, shared_drivers.astype(float), teleport
    ])
    return pd.DataFrame(data, columns=FRAUD_FEATURES), fraud

def _generate_standard_pricing(n_samples: int = 1000):
    rng = np.random.default_rng(456)
    earnings = _clip(rng.lognormal(mean=np.log(7500), sigma=0.3, size=n_samples), 2200, 22000)
    lf = _clip(rng.beta(a=2.1, b=2.7, size=n_samples), 0.05, 0.95)
    ct = rng.choice([0.4, 0.6, 0.8], size=n_samples)
    margin = _clip(rng.normal(loc=0.1, scale=0.015, size=n_samples), 0.08, 0.15)
    
    # PREMIUM FORMULA MUST MATCH train_models.py (including CLIP)
    premium = earnings * 0.015 * lf * ct * (1.0 + margin)
    premium_hard = _clip(premium, 50.0, 300.0)
    premium = premium_hard + 0.01 * np.maximum(0, premium - 300.0)
    
    return pd.DataFrame(np.column_stack([earnings, lf, ct, margin]), columns=PRICE_FEATURES), premium

# --- Adversarial Generators ---
def _generate_adversarial_fraud(n_samples: int = 1000):
    """Sophisticated: Warm devices, subtle speed anomaly, below teleport cutoff."""
    rng = np.random.default_rng(999)
    speeds = rng.normal(35.0, 2.0, n_samples) # Consistently slightly high speed
    mismatch = np.ones(n_samples) # Always subtle mismatch
    shared_drivers = rng.integers(2, 4, size=n_samples) # Shared but not flood
    h3_consistency = rng.uniform(0.75, 0.85, n_samples)
    # They stay at teleport ratio of 20 (high but not impossible)
    delta_dist = rng.uniform(100, 200, n_samples)
    delta_t = delta_dist / 20.0
    
    data = np.column_stack([
        speeds, np.zeros(n_samples), mismatch, 
        (speeds-28)/8, np.ones(n_samples), np.zeros(n_samples),
        h3_consistency, delta_dist, delta_t, shared_drivers.astype(float), np.ones(n_samples)*20.0
    ])
    return pd.DataFrame(data, columns=FRAUD_FEATURES), np.ones(n_samples, dtype=int)

def _generate_adversarial_risk(n_samples: int = 2000):
    """Extreme Corner Cases: AQI 350-450 + 0.5-0.8 Demand (Testing boundaries)."""
    rng = np.random.default_rng(1010)
    rain = rng.uniform(80, 150, n_samples) # Still high but not 220
    aqi = rng.uniform(300, 450, n_samples)
    demand = rng.uniform(0.5, 0.9, n_samples)
    day = rng.choice([5, 6], size=n_samples) # Weekend
    tenure = rng.uniform(1, 365, n_samples) # Mixed tenure
    zone_risk = rng.uniform(0.6, 0.9, n_samples)
    hour = rng.integers(0, 24, size=n_samples)
    
    risk_linear = (0.85 * (rain / 20.0) + 0.45 * (aqi / 100.0) + 1.25 * (demand - 1.0) + 1.15 * zone_risk - 2.8)
    prob = 1.0 / (1.0 + np.exp(-risk_linear))
    y = (rng.random(n_samples) < prob).astype(int)
    data = np.column_stack([rain, aqi, demand, hour, day, zone_risk, tenure])
    return pd.DataFrame(data, columns=RISK_FEATURES), y

def _generate_adversarial_pricing(n_samples: int = 500):
    """Extrapolated: High-value tokens."""
    rng = np.random.default_rng(2022)
    earnings = rng.uniform(40000, 80000, n_samples) # 10x normal
    lf = rng.uniform(0.95, 1.05, n_samples)
    ct = rng.uniform(0.8, 1.0, n_samples)
    margin = rng.uniform(0.15, 0.25, n_samples)
    
    premium = earnings * 0.015 * lf * ct * (1.0 + margin)
    premium_hard = _clip(premium, 50.0, 300.0) # Match production clip
    premium = premium_hard + 0.01 * np.maximum(0, premium - 300.0)
    
    return pd.DataFrame(np.column_stack([earnings, lf, ct, margin]), columns=PRICE_FEATURES), premium

def run_adversarial_audit():
    print("=== ADVERSARIAL ML HARD EVALUATION ===")
    path = "data"
    risk_model = joblib.load(os.path.join(path, "risk_xgb_models.pkl"))["model"]
    fraud_gb = joblib.load(os.path.join(path, "fraud_gb.pkl"))["model"]
    fraud_if = joblib.load(os.path.join(path, "fraud_if.pkl"))
    price_model = joblib.load(os.path.join(path, "price_lgb.pkl"))

    results = []

    # RISK
    x, y = _generate_standard_risk()
    std_auc = roc_auc_score(y, risk_model.predict_proba(_apply_jitter(x))[:, 1])
    xa, ya = _generate_adversarial_risk()
    adv_auc = roc_auc_score(ya, risk_model.predict_proba(xa)[:, 1])
    results.append(("Risk XGB (AUC)", std_auc, adv_auc))

    # FRAUD
    x, y = _generate_standard_fraud()
    std_auc = roc_auc_score(y, fraud_gb.predict_proba(_apply_jitter(x))[:, 1])
    
    xn, yn = _generate_standard_fraud(2000)
    xa_hard, ya_hard = _generate_adversarial_fraud(400)
    mixed_x = pd.concat([xn, xa_hard])
    mixed_y = np.concatenate([np.zeros(2000), np.ones(400)])
    adv_auc = roc_auc_score(mixed_y, fraud_gb.predict_proba(mixed_x)[:, 1])
    results.append(("Fraud GBDT (AUC)", std_auc, adv_auc))

    # FRAUD IF
    std_if = roc_auc_score(y, -fraud_if.score_samples(_apply_jitter(x)))
    adv_if = roc_auc_score(mixed_y, -fraud_if.score_samples(mixed_x))
    results.append(("Fraud IF (AUC)", std_if, adv_if))

    # PRICING
    std_x, std_y = _generate_standard_pricing()
    # 1. Prediction with Log-Target Inverse (np.exp)
    # Using clean data for both to measure true structural drift (Delta)
    preds = np.exp(price_model.predict(std_x))
    # 4. Production-Grade Soft-Tail Clipping: [50, 300]
    preds_hard = _clip(preds, 50.0, 300.0)
    preds = preds_hard + 0.01 * np.maximum(0, preds - 300.0)
    std_mape = mean_absolute_percentage_error(std_y, preds)
    
    xa, ya = _generate_adversarial_pricing()
    adv_preds = np.exp(price_model.predict(xa))
    adv_preds_hard = _clip(adv_preds, 50.0, 300.0)
    adv_preds = adv_preds_hard + 0.01 * np.maximum(0, adv_preds - 300.0)
    adv_mape = mean_absolute_percentage_error(ya, adv_preds)
    results.append(("Pricing LGBM (MAPE)", std_mape, adv_mape))

    print(f"{'Model Metric':<20} | {'Standard':<10} | {'Adversarial':<12} | {'Delta %':<10} | {'Status'}")
    print("-" * 75)
    for name, std, adv in results:
        delta = abs(std - adv) / std * 100
        # For MAPE, smaller is better. For AUC, larger is better.
        # Status is ROBUST if delta is small OR if the model actually performed BETTER on adversarial data.
        importance_of_improvement = (adv < std) if "MAPE" in name else (adv > std)
        status = "ROBUST" if (delta < 25 or importance_of_improvement) else "BRITTLE"
        print(f"{name:<20} | {std:>10.4f} | {adv:>12.4f} | {delta:>9.1f}% | {status}")

if __name__ == "__main__":
    run_adversarial_audit()
