import json
import os
from datetime import datetime, timezone

import joblib
import lightgbm as lgb
import numpy as np
import xgboost as xgb
from sklearn.ensemble import GradientBoostingClassifier, IsolationForest
from sklearn.metrics import roc_auc_score
from sklearn.model_selection import StratifiedKFold, train_test_split

DATA_DIR = os.path.join(os.path.dirname(__file__), "data")
MODEL_VERSION = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")

# Calibrated from urban India gig-economy field patterns and Fairwork India reports.
MEDIAN_WEEKLY_EARNINGS_INR = 7200.0
EARNINGS_LOG_SIGMA = 0.38
FRAUD_BASE_RATE = 0.08
NORMAL_SPEED_MEAN_KMH = 28.0
NORMAL_SPEED_STD_KMH = 9.0


def _clip(arr: np.ndarray, lo: float, hi: float) -> np.ndarray:
    return np.minimum(np.maximum(arr, lo), hi)


def _generate_risk_dataset(n_samples: int = 50000) -> tuple[np.ndarray, np.ndarray, list[str]]:
    rng = np.random.default_rng(42)
    rainfall = _clip(rng.gamma(shape=2.2, scale=8.0, size=n_samples), 0, 220)
    aqi = _clip(rng.normal(loc=118, scale=52, size=n_samples), 20, 450)
    demand_factor = _clip(rng.normal(loc=1.1, scale=0.25, size=n_samples), 0.4, 2.8)
    hour_of_day = rng.integers(0, 24, size=n_samples)
    day_of_week = rng.integers(0, 7, size=n_samples)
    zone_historical_risk = _clip(rng.beta(a=2.3, b=4.8, size=n_samples), 0, 1)
    driver_tenure_days = _clip(rng.lognormal(mean=np.log(220), sigma=0.9, size=n_samples), 1, 3650)

    # Amplified coefficients to survive sigmoid transformation and binomial noise
    risk_linear = (
        0.85 * (rainfall / 20.0)      # Grouped into units of 20mm for robust scaling
        + 0.45 * (aqi / 100.0)        # Grouped into units of 100 AQI
        + 1.25 * (demand_factor - 1.0)
        + 1.15 * zone_historical_risk
        + 0.15 * (365 - np.minimum(driver_tenure_days, 365)) / 365.0
        + 0.35 * np.isin(hour_of_day, [8, 9, 10, 18, 19, 20]).astype(float)
        + 0.25 * np.isin(day_of_week, [5, 6]).astype(float)
        - 2.8
    )
    probabilities = 1.0 / (1.0 + np.exp(-risk_linear))
    y = (rng.random(n_samples) < probabilities).astype(int)

    features = np.column_stack(
        [
            rainfall,
            aqi,
            demand_factor,
            hour_of_day,
            day_of_week,
            zone_historical_risk,
            driver_tenure_days,
        ]
    )
    names = [
        "rainfall_mm",
        "aqi_index",
        "demand_factor",
        "hour_of_day",
        "day_of_week",
        "zone_historical_risk",
        "driver_tenure_days",
    ]
    return features, y, names


def _generate_pricing_dataset(n_samples: int = 6000) -> tuple[np.ndarray, np.ndarray]:
    rng = np.random.default_rng(7)
    earnings = _clip(
        rng.lognormal(mean=np.log(MEDIAN_WEEKLY_EARNINGS_INR), sigma=EARNINGS_LOG_SIGMA, size=n_samples),
        2200,
        22000,
    )
    lf = _clip(rng.beta(a=2.0, b=2.6, size=n_samples), 0.05, 0.95)
    ct = rng.choice([0.4, 0.6, 0.8], size=n_samples, p=[0.35, 0.45, 0.2])
    margin = _clip(rng.normal(loc=0.105, scale=0.018, size=n_samples), 0.08, 0.15)

    # Premium formula anchored on alpha=0.015 used in backend pricing.
    premium = earnings * 0.015 * lf * ct * (1.0 + margin)
    premium = _clip(premium, 50.0, 260.0)
    return np.column_stack([earnings, lf, ct, margin]), premium


def _inject_fraud_patterns(n_samples: int = 10000) -> tuple[np.ndarray, np.ndarray, list[str], dict[str, int]]:
    rng = np.random.default_rng(99)

    speeds = _clip(rng.normal(NORMAL_SPEED_MEAN_KMH, NORMAL_SPEED_STD_KMH, n_samples), 0, 180)
    claims_filed = rng.poisson(lam=0.35, size=n_samples)
    claims_rejected = np.minimum(claims_filed, rng.binomial(np.maximum(claims_filed, 1), 0.15))
    mismatch = rng.binomial(1, 0.04, size=n_samples)
    h3_consistency = _clip(rng.normal(0.94, 0.07, n_samples), 0, 1)
    delta_distance_m = _clip(rng.normal(58, 32, n_samples), 0, 5000)
    delta_t_s = _clip(rng.normal(210, 110, n_samples), 1, 5000)
    shared_drivers = np.maximum(1, rng.poisson(lam=1.2, size=n_samples))
    weekly_earnings = _clip(
        rng.lognormal(mean=np.log(MEDIAN_WEEKLY_EARNINGS_INR), sigma=EARNINGS_LOG_SIGMA, size=n_samples),
        1500,
        60000,
    )

    fraud = np.zeros(n_samples, dtype=int)
    fraud_count = int(n_samples * FRAUD_BASE_RATE)
    fraud_idx = rng.choice(np.arange(n_samples), size=fraud_count, replace=False)
    fraud[fraud_idx] = 1

    pattern_counts = {
        "gps_teleport": 0,
        "claim_burst": 0,
        "device_sharing": 0,
        "earnings_anomaly": 0,
    }

    for idx in fraud_idx:
        pattern = rng.choice(["gps_teleport", "claim_burst", "device_sharing", "earnings_anomaly"])
        pattern_counts[pattern] += 1

        if pattern == "gps_teleport":
            # Overlapping ranges to force model to look at clusters of features
            delta_distance_m[idx] = rng.uniform(120, 650)
            delta_t_s[idx] = rng.uniform(15, 85)
            # Impossible speed but within reachable highway bounds [60, 130]
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
            # Changed massive outliers (9.5x) to subtle realistic multipliers (1.2x-1.8x)
            weekly_earnings[idx] = _clip(weekly_earnings[idx] * rng.uniform(1.2, 1.8), 2000, 75000)
            h3_consistency[idx] = rng.uniform(0.85, 0.98)

    claims_rate = claims_rejected / np.maximum(claims_filed, 1)
    velocity_z = (speeds - NORMAL_SPEED_MEAN_KMH) / NORMAL_SPEED_STD_KMH
    teleport_ratio = delta_distance_m / np.maximum(delta_t_s, 0.5)

    # REMOVED: earnings_ratio (explicit proxy for the label)
    features = np.column_stack(
        [
            speeds,
            claims_rate,
            mismatch.astype(float),
            velocity_z,
            claims_filed.astype(float),
            claims_rejected.astype(float),
            h3_consistency,
            delta_distance_m,
            delta_t_s,
            shared_drivers.astype(float),
            teleport_ratio,
        ]
    )

    names = [
        "speed_kmh",
        "claims_rejection_rate",
        "device_mismatch",
        "velocity_z",
        "claims_filed",
        "claims_rejected",
        "h3_zone_consistency",
        "delta_distance_m",
        "delta_t_s",
        "shared_driver_count_24h",
        "teleport_ratio",
    ]
    return features, fraud, names, pattern_counts


def _cross_val_auc(model, X: np.ndarray, y: np.ndarray) -> dict:
    fold = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    scores = []
    for train_idx, test_idx in fold.split(X, y):
        model.fit(X[train_idx], y[train_idx])
        proba = model.predict_proba(X[test_idx])[:, 1]
        scores.append(float(roc_auc_score(y[test_idx], proba)))
    return {"mean_auc": float(np.mean(scores)), "std_auc": float(np.std(scores))}


def train_and_save() -> None:
    os.makedirs(DATA_DIR, exist_ok=True)

    X_risk, y_risk, risk_feature_names = _generate_risk_dataset()
    X_train, X_test, y_train, y_test = train_test_split(
        X_risk,
        y_risk,
        test_size=0.2,
        random_state=42,
        stratify=y_risk,
    )
    risk_model = xgb.XGBClassifier(
        n_estimators=180,
        max_depth=5,
        learning_rate=0.05,
        subsample=0.9,
        colsample_bytree=0.9,
        eval_metric="logloss",
        random_state=42,
    )
    risk_model.fit(X_train, y_train)
    risk_test_auc = float(roc_auc_score(y_test, risk_model.predict_proba(X_test)[:, 1]))
    risk_cv = _cross_val_auc(
        xgb.XGBClassifier(
            n_estimators=140,
            max_depth=4,
            learning_rate=0.06,
            subsample=0.9,
            colsample_bytree=0.9,
            eval_metric="logloss",
            random_state=42,
        ),
        X_risk,
        y_risk,
    )

    risk_artifact = {
        "model": risk_model,
        "feature_names": risk_feature_names,
        "version": MODEL_VERSION,
    }
    joblib.dump(risk_artifact, os.path.join(DATA_DIR, "risk_xgb_models.pkl"))
    joblib.dump(risk_artifact, os.path.join(DATA_DIR, f"risk_xgb_model_{MODEL_VERSION}.pkl"))

    X_price, y_price = _generate_pricing_dataset()
    price_model = lgb.LGBMRegressor(n_estimators=220, learning_rate=0.05, random_state=42)
    price_model.fit(X_price, y_price)
    joblib.dump(price_model, os.path.join(DATA_DIR, "price_lgb.pkl"))
    joblib.dump(price_model, os.path.join(DATA_DIR, f"price_lgb_{MODEL_VERSION}.pkl"))

    X_fraud, y_fraud, fraud_feature_names, pattern_counts = _inject_fraud_patterns()
    Xf_train, Xf_test, yf_train, yf_test = train_test_split(
        X_fraud,
        y_fraud,
        test_size=0.2,
        random_state=42,
        stratify=y_fraud,
    )

    anomaly_model = IsolationForest(
        n_estimators=240,
        contamination=FRAUD_BASE_RATE,
        random_state=42,
    )
    anomaly_model.fit(Xf_train)
    joblib.dump(anomaly_model, os.path.join(DATA_DIR, "fraud_if.pkl"))
    joblib.dump(anomaly_model, os.path.join(DATA_DIR, f"fraud_if_{MODEL_VERSION}.pkl"))

    fraud_classifier = GradientBoostingClassifier(
        n_estimators=240,
        learning_rate=0.05,
        max_depth=3,
        random_state=42,
    )
    fraud_classifier.fit(Xf_train, yf_train)
    fraud_auc = float(roc_auc_score(yf_test, fraud_classifier.predict_proba(Xf_test)[:, 1]))
    fraud_cv = _cross_val_auc(
        GradientBoostingClassifier(n_estimators=180, learning_rate=0.05, max_depth=3, random_state=42),
        X_fraud,
        y_fraud,
    )
    fraud_artifact = {
        "model": fraud_classifier,
        "feature_names": fraud_feature_names,
        "version": MODEL_VERSION,
    }
    joblib.dump(fraud_artifact, os.path.join(DATA_DIR, "fraud_gb.pkl"))
    joblib.dump(fraud_artifact, os.path.join(DATA_DIR, f"fraud_gb_{MODEL_VERSION}.pkl"))

    metadata = {
        "model_version": MODEL_VERSION,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "risk": {
            "train_rows": int(X_train.shape[0]),
            "test_rows": int(X_test.shape[0]),
            "test_auc": risk_test_auc,
            "cross_validation": risk_cv,
            "feature_importance": {
                risk_feature_names[idx]: float(score)
                for idx, score in enumerate(getattr(risk_model, "feature_importances_", []))
            },
        },
        "fraud": {
            "train_rows": int(Xf_train.shape[0]),
            "test_rows": int(Xf_test.shape[0]),
            "base_rate": FRAUD_BASE_RATE,
            "test_auc": fraud_auc,
            "cross_validation": fraud_cv,
            "pattern_injection_counts": pattern_counts,
            "feature_importance": {
                fraud_feature_names[idx]: float(score)
                for idx, score in enumerate(getattr(fraud_classifier, "feature_importances_", []))
            },
        },
        "pricing": {
            "train_rows": int(X_price.shape[0]),
            "feature_names": ["weekly_earnings", "lf", "ct", "margin"],
        },
    }

    with open(os.path.join(DATA_DIR, "model_metadata.json"), "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2)

    print(f"Training complete. Model version: {MODEL_VERSION}")


if __name__ == "__main__":
    train_and_save()
