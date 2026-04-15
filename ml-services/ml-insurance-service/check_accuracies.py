
import numpy as np
import joblib
import os
from sklearn.metrics import roc_auc_score, mean_absolute_percentage_error
from sklearn.model_selection import train_test_split

# Constants
MEDIAN_WEEKLY_EARNINGS_INR = 7200.0
EARNINGS_LOG_SIGMA = 0.38
FRAUD_BASE_RATE = 0.08
NORMAL_SPEED_MEAN_KMH = 28.0
NORMAL_SPEED_STD_KMH = 9.0

def _clip(arr: np.ndarray, lo: float, hi: float) -> np.ndarray:
    return np.minimum(np.maximum(arr, lo), hi)

def _generate_risk_dataset(n_samples: int = 50000):
    rng = np.random.default_rng(42)
    rainfall = _clip(rng.gamma(shape=2.2, scale=8.0, size=n_samples), 0, 220)
    aqi = _clip(rng.normal(loc=118, scale=52, size=n_samples), 20, 450)
    demand_factor = _clip(rng.normal(loc=1.1, scale=0.25, size=n_samples), 0.4, 2.8)
    hour_of_day = rng.integers(0, 24, size=n_samples)
    day_of_week = rng.integers(0, 7, size=n_samples)
    zone_historical_risk = _clip(rng.beta(a=2.3, b=4.8, size=n_samples), 0, 1)
    driver_tenure_days = _clip(rng.lognormal(mean=np.log(220), sigma=0.9, size=n_samples), 1, 3650)
    risk_linear = (
        0.85 * (rainfall / 20.0)
        + 0.45 * (aqi / 100.0)
        + 1.25 * (demand_factor - 1.0)
        + 1.15 * zone_historical_risk
        + 0.15 * (365 - np.minimum(driver_tenure_days, 365)) / 365.0
        + 0.35 * np.isin(hour_of_day, [8, 9, 10, 18, 19, 20]).astype(float)
        + 0.25 * np.isin(day_of_week, [5, 6]).astype(float)
        - 2.8
    )
    probabilities = 1.0 / (1.0 + np.exp(-risk_linear))
    y = (rng.random(n_samples) < probabilities).astype(int)
    return np.column_stack([rainfall, aqi, demand_factor, hour_of_day, day_of_week, zone_historical_risk, driver_tenure_days]), y

def _inject_fraud_patterns(n_samples: int = 10000):
    rng = np.random.default_rng(99)
    speeds = _clip(rng.normal(NORMAL_SPEED_MEAN_KMH, NORMAL_SPEED_STD_KMH, n_samples), 0, 180)
    claims_filed = rng.poisson(lam=0.35, size=n_samples)
    claims_rejected = np.minimum(claims_filed, rng.binomial(np.maximum(claims_filed, 1), 0.15))
    mismatch = rng.binomial(1, 0.04, size=n_samples)
    h3_consistency = _clip(rng.normal(0.94, 0.07, n_samples), 0, 1)
    delta_distance_m = _clip(rng.normal(58, 32, n_samples), 0, 5000)
    delta_t_s = _clip(rng.normal(210, 110, n_samples), 1, 5000)
    shared_drivers = np.maximum(1, rng.poisson(lam=1.2, size=n_samples))
    weekly_earnings = _clip(rng.lognormal(mean=np.log(MEDIAN_WEEKLY_EARNINGS_INR), sigma=EARNINGS_LOG_SIGMA, size=n_samples), 1500, 60000)
    fraud = np.zeros(n_samples, dtype=int)
    fraud_count = int(n_samples * FRAUD_BASE_RATE)
    fraud_idx = rng.choice(np.arange(n_samples), size=fraud_count, replace=False)
    fraud[fraud_idx] = 1
    for idx in fraud_idx:
        pattern = rng.choice(["gps_teleport", "claim_burst", "device_sharing", "earnings_anomaly"])
        if pattern == "gps_teleport":
            delta_distance_m[idx] = rng.uniform(120, 650)
            delta_t_s[idx] = rng.uniform(15, 85)
            speeds[idx] = _clip(delta_distance_m[idx] / max(delta_t_s[idx], 0.4) * 3.6, 65, 135)
            mismatch[idx] = 1
            h3_consistency[idx] = rng.uniform(0.65, 0.85)
        elif pattern == "claim_burst":
            claims_filed[idx] = rng.integers(2, 5)
            claims_rejected[idx] = rng.integers(1, claims_filed[idx] + 1)
            h3_consistency[idx] = rng.uniform(0.75, 0.92)
        elif pattern == "device_sharing":
            shared_drivers[idx] = rng.integers(3, 7)
            mismatch[idx] = 1
            claims_filed[idx] = rng.integers(1, 4)
            claims_rejected[idx] = rng.integers(0, claims_filed[idx] + 1)
        elif pattern == "earnings_anomaly":
            weekly_earnings[idx] = _clip(weekly_earnings[idx] * rng.uniform(1.2, 1.8), 2000, 75000)
            h3_consistency[idx] = rng.uniform(0.85, 0.98)
    claims_rate = claims_rejected / np.maximum(claims_filed, 1)
    velocity_z = (speeds - NORMAL_SPEED_MEAN_KMH) / NORMAL_SPEED_STD_KMH
    teleport_ratio = delta_distance_m / np.maximum(delta_t_s, 0.5)
    return np.column_stack([speeds, claims_rate, mismatch.astype(float), velocity_z, claims_filed.astype(float), claims_rejected.astype(float), h3_consistency, delta_distance_m, delta_t_s, shared_drivers.astype(float), teleport_ratio]), fraud

def _generate_pricing_dataset(n_samples: int = 6000):
    rng = np.random.default_rng(7)
    earnings = _clip(rng.lognormal(mean=np.log(MEDIAN_WEEKLY_EARNINGS_INR), sigma=EARNINGS_LOG_SIGMA, size=n_samples), 2200, 22000)
    lf = _clip(rng.beta(a=2.0, b=2.6, size=n_samples), 0.05, 0.95)
    ct = rng.choice([0.4, 0.6, 0.8], size=n_samples, p=[0.35, 0.45, 0.2])
    margin = _clip(rng.normal(loc=0.105, scale=0.018, size=n_samples), 0.08, 0.15)
    premium = _clip(earnings * 0.015 * lf * ct * (1.0 + margin), 50.0, 260.0)
    return np.column_stack([earnings, lf, ct, margin]), premium

# Load models
path = os.path.join(os.path.dirname(__file__), "data")
risk_art = joblib.load(os.path.join(path, "risk_xgb_models.pkl"))
risk_model = risk_art["model"]
fraud_if = joblib.load(os.path.join(path, "fraud_if.pkl"))
fraud_gb_art = joblib.load(os.path.join(path, "fraud_gb.pkl"))
fraud_gb = fraud_gb_art["model"]
price_model = joblib.load(os.path.join(path, "price_lgb.pkl"))

# Evals
Xr, yr = _generate_risk_dataset()
_, Xr_test, _, yr_test = train_test_split(Xr, yr, test_size=0.2, random_state=42, stratify=yr)
risk_auc = roc_auc_score(yr_test, risk_model.predict_proba(Xr_test)[:, 1])

Xf, yf = _inject_fraud_patterns()
Xf_train, Xf_test, yf_train, yf_test = train_test_split(Xf, yf, test_size=0.2, random_state=42, stratify=yf)
fraud_gb_auc = roc_auc_score(yf_test, fraud_gb.predict_proba(Xf_test)[:, 1])

# Isolation Forest Scoring (Unsupervised)
# score_samples returns opposite of anomaly score (higher is normal)
if_scores = -fraud_if.score_samples(Xf_test) 
if_auc = roc_auc_score(yf_test, if_scores)

Xp, yp = _generate_pricing_dataset()
Xp_train, Xp_test, yp_train, yp_test = train_test_split(Xp, yp, test_size=0.2, random_state=42)
price_preds = price_model.predict(Xp_test)
price_mape = mean_absolute_percentage_error(yp_test, price_preds)

print(f"Risk XGB AUC: {risk_auc:.4f}")
print(f"Fraud GBDT AUC: {fraud_gb_auc:.4f}")
print(f"Fraud IF AUC: {if_auc:.4f}")
print(f"Pricing MAPE: {price_mape:.4f}")
