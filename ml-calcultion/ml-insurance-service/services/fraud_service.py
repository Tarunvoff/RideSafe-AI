import numpy as np
from models.schemas import FraudScoreRequest, FraudScoreResponse
from utils.model_loader import model_loader
from config import (
    ANOMALY_SIGMOID_SCALE,
    SPEED_NORMAL_MEAN, SPEED_NORMAL_STDEV,
    FRAUD_RULE_SPEED_LIMIT, FRAUD_RULE_REJECTION_RATE_LIMIT, FRAUD_RULE_CLAIM_FLOOD_LIMIT,
    FRAUD_LABEL_LOW_THRESHOLD, FRAUD_LABEL_MEDIUM_THRESHOLD,
)


def _normalize_anomaly_score(raw_score: float) -> float:
    """
    ── FIX #2: Proper sigmoid normalization ──────────────────────────────────
    IsolationForest.decision_function output polarity:
      - Positive score → inlier (NORMAL behavior) → low fraud
      - Negative score → outlier (ANOMALY)         → high fraud

    Formula: 1 / (1 + exp(-5 × score))
    ANOMALY_SIGMOID_SCALE = -5 (stored as negative in config)

    Effect:
      - Negative score (anomaly):  exp(-5 × negative) = exp(+big) → sigmoid → HIGH
      - Positive score (normal):   exp(-5 × positive) = exp(-big) → sigmoid → LOW
    ─────────────────────────────────────────────────────────────────────────
    """
    return float(1.0 / (1.0 + np.exp(ANOMALY_SIGMOID_SCALE * raw_score)))


def calculate_fraud_score(request: FraudScoreRequest) -> FraudScoreResponse:
    """
    FraudScore = 0.5 × anomaly + 0.3 × supervised + 0.2 × rule_score
    """
    speed    = request.gps.speed or 0.0
    mismatch = int(request.device.mismatch)
    filed    = request.history.claims_filed
    rejected = request.history.claims_rejected

    # ── 1. IsolationForest Anomaly Score ──────────────────────────────────────
    if model_loader.fraud_anomaly_model:
        claims_rate = rejected / max(filed, 1)
        velocity_z  = (speed - SPEED_NORMAL_MEAN) / SPEED_NORMAL_STDEV
        features_if = np.array([[speed, claims_rate, float(mismatch), velocity_z]])
        raw_score   = model_loader.fraud_anomaly_model.decision_function(features_if)[0]
        anomaly_score = _normalize_anomaly_score(raw_score)
    else:
        anomaly_score = 0.0

    # ── 2. GradientBoosting Supervised Score ──────────────────────────────────
    if model_loader.fraud_classifier_model:
        features_gb    = np.array([[float(filed), float(rejected), float(mismatch)]])
        supervised_score = float(model_loader.fraud_classifier_model.predict_proba(features_gb)[0][1])
    else:
        supervised_score = 0.0

    # ── 3. Rule Engine Score ──────────────────────────────────────────────────
    rule_score = 0.0

    if speed > FRAUD_RULE_SPEED_LIMIT:
        rule_score += 0.5   # GPS spoof — physically impossible for gig worker

    if request.device.mismatch:
        rule_score += 0.5   # Device swap — strong fraud signal

    if filed > 0 and (rejected / filed) > FRAUD_RULE_REJECTION_RATE_LIMIT:
        rule_score += 0.4   # >50% rejection rate — systematic abuse

    if filed > FRAUD_RULE_CLAIM_FLOOD_LIMIT:
        rule_score += 0.2   # Claim flooding pattern

    rule_score = min(1.0, rule_score)

    # ── Final weighted formula ────────────────────────────────────────────────
    fraud_score = (0.5 * anomaly_score) + (0.3 * supervised_score) + (0.2 * rule_score)
    fraud_score = max(0.0, min(1.0, fraud_score))

    if fraud_score < FRAUD_LABEL_LOW_THRESHOLD:
        label = "LOW"
    elif fraud_score < FRAUD_LABEL_MEDIUM_THRESHOLD:
        label = "MEDIUM"
    else:
        label = "HIGH"

    return FraudScoreResponse(
        score=round(fraud_score, 4),
        label=label
    )
