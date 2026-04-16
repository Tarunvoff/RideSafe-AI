import numpy as np
from models.schemas import (
    FraudHybridScoreRequest,
    FraudHybridScoreResponse,
    FraudScoreRequest,
    FraudScoreResponse,
)
from utils.model_loader import model_loader
from config import (
    ANOMALY_SIGMOID_SCALE,
    SPEED_NORMAL_MEAN, SPEED_NORMAL_STDEV,
    FRAUD_RULE_SPEED_LIMIT, FRAUD_RULE_REJECTION_RATE_LIMIT, FRAUD_RULE_CLAIM_FLOOD_LIMIT,
    FRAUD_LABEL_LOW_THRESHOLD, FRAUD_LABEL_MEDIUM_THRESHOLD,
)
import logging

logger = logging.getLogger(__name__)

FRAUD_CONFIDENCE_THRESHOLD = 0.65
TELEPORT_DISTANCE_METERS = 200.0
TELEPORT_MAX_SECONDS = 2.0


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


def _build_hybrid_rule_score(request: FraudHybridScoreRequest) -> tuple[float, list[str]]:
    score = 0.0
    signals: list[str] = []

    if request.gps_speed > FRAUD_RULE_SPEED_LIMIT:
        score += 0.35
        signals.append("GPS_TELEPORT_PATTERN")
    if request.claims_last_30d > FRAUD_RULE_CLAIM_FLOOD_LIMIT:
        score += 0.25
        signals.append("CLAIM_BURST_30D")
    if request.claims_last_24h >= 3:
        score += 0.25
        signals.append("CLAIM_BURST_24H")
    if request.device_switch_frequency > 4:
        score += 0.2
        signals.append("DEVICE_SWITCH_RING")
    if request.shared_driver_count_24h >= 5:
        score += 0.2
        signals.append("DEVICE_SHARING_CLUSTER")
    if request.earnings_pattern_deviation > 3:
        score += 0.2
        signals.append("EARNINGS_PATTERN_DEVIATION")
    if request.mismatch:
        score += 0.2
        signals.append("DEVICE_MISMATCH")

    return min(1.0, score), signals


def calculate_hybrid_fraud_score(request: FraudHybridScoreRequest) -> FraudHybridScoreResponse:
    rule_score, signals = _build_hybrid_rule_score(request)

    feature_vector = np.array(
        [
            float(request.gps_speed),
            float(request.claims_last_30d) / max(float(request.claims_last_30d), 1.0),
            float(1 if request.mismatch else 0),
            float((request.gps_speed - SPEED_NORMAL_MEAN) / max(SPEED_NORMAL_STDEV, 1e-6)),
            float(request.claims_last_30d),
            float(request.claims_last_24h),
            float(request.h3_zone_consistency),
            float(request.gps_speed * 4.0),
            float(max(1.0, 120.0 / max(request.gps_speed, 1.0))),
            float(request.shared_driver_count_24h),
            float(request.gps_speed),
        ],
        dtype=float,
    ).reshape(1, -1)

    ml_available = model_loader.fraud_anomaly_model is not None and model_loader.fraud_classifier_model is not None
    if not ml_available:
        return FraudHybridScoreResponse(
            fraud_score=round(rule_score * 100.0, 2),
            rule_score=round(rule_score * 100.0, 2),
            ml_anomaly_score=0.0,
            ml_classifier_score=0.0,
            top_signals=(signals or ["RULE_BASELINE"])[:3],
            model_used="rules_only",
        )

    try:
        raw_if = float(model_loader.fraud_anomaly_model.decision_function(feature_vector)[0])
        anomaly_score = _normalize_anomaly_score(raw_if)
        gb_score = float(model_loader.fraud_classifier_model.predict_proba(feature_vector)[0][1])
    except Exception:
        return FraudHybridScoreResponse(
            fraud_score=round(rule_score * 100.0, 2),
            rule_score=round(rule_score * 100.0, 2),
            ml_anomaly_score=0.0,
            ml_classifier_score=0.0,
            top_signals=(signals or ["RULE_BASELINE"])[:3],
            model_used="rules_only",
        )

    final_score = (0.4 * rule_score) + (0.3 * anomaly_score) + (0.3 * gb_score)
    final_score = max(0.0, min(1.0, final_score))

    return FraudHybridScoreResponse(
        fraud_score=round(final_score * 100.0, 2),
        rule_score=round(rule_score * 100.0, 2),
        ml_anomaly_score=round(anomaly_score * 100.0, 2),
        ml_classifier_score=round(gb_score * 100.0, 2),
        top_signals=(signals or ["MODEL_ANOMALY_SIGNAL"])[:3],
        model_used="hybrid",
    )


def calculate_fraud_score(request: FraudScoreRequest) -> FraudScoreResponse:
    """
    FraudScore = 0.5 × anomaly + 0.3 × supervised + 0.2 × rule_score
    """
    speed = request.gps.speed or 0.0
    mismatch = int(request.device.mismatch)
    filed = request.history.claims_filed
    rejected = request.history.claims_rejected
    claims_rate = rejected / max(filed, 1)
    velocity_z = (speed - SPEED_NORMAL_MEAN) / SPEED_NORMAL_STDEV

    delta_distance_m = float(request.history.prior_gps_points_count or 1) * 20.0
    delta_t_s = max(1.0, float(request.history.prior_gps_points_count or 1) * 2.5)
    shared_driver_count = float(request.device.shared_driver_count_24h or 1)
    teleport_ratio = delta_distance_m / max(delta_t_s, 0.5)

    # Align with names from train_models.py
    feature_names = [
        "speed_kmh", "claims_rejection_rate", "device_mismatch", "velocity_z",
        "claims_filed", "claims_rejected", "h3_zone_consistency",
        "delta_distance_m", "delta_t_s", "shared_driver_count_24h", "teleport_ratio"
    ]
    
    feature_data = [
        speed, claims_rate, float(mismatch), velocity_z,
        float(filed), float(rejected),
        float(request.gps.h3_zone_consistency if request.gps.h3_zone_consistency is not None else 1.0),
        delta_distance_m, delta_t_s, shared_driver_count, teleport_ratio
    ]
    
    import pandas as pd
    df = pd.DataFrame([feature_data], columns=feature_names)

    # ── 1. IsolationForest Anomaly Score ──────────────────────────────────────
    if model_loader.fraud_anomaly_model:
        # Internal validation to prevent silent drift
        if hasattr(model_loader.fraud_anomaly_model, "feature_names_in_"):
            if list(model_loader.fraud_anomaly_model.feature_names_in_) != feature_names:
                logger.error("Fraud IF feature mismatch! Expected %s", model_loader.fraud_anomaly_model.feature_names_in_)
        
        raw_score = model_loader.fraud_anomaly_model.decision_function(df)[0]
        anomaly_score = _normalize_anomaly_score(raw_score)

        # H3 Adjustment: adjust anomaly score based on zone consistency
        h3_consistency = request.gps.h3_zone_consistency if request.gps.h3_zone_consistency is not None else 1.0
        # Lower consistency means higher anomaly
        anomaly_score = min(1.0, anomaly_score + (1.0 - h3_consistency) * 0.3)
    else:
        anomaly_score = 0.0

    # ── 2. GradientBoosting Supervised Score ──────────────────────────────────
    if model_loader.fraud_classifier_model:
        supervised_score = float(model_loader.fraud_classifier_model.predict_proba(df)[0][1])
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

    # H3 History rule
    if request.history.has_history_in_zone is False:
        rule_score += 0.3  # Strong signal: user is claiming in a zone they've never been

    if delta_distance_m > TELEPORT_DISTANCE_METERS and delta_t_s < TELEPORT_MAX_SECONDS:
        rule_score += 0.45

    if shared_driver_count >= 5:
        rule_score += 0.4

    if (request.history.last_12h_claims or 0) >= 3:
        rule_score += 0.35

    rule_score = min(1.0, rule_score)

    # ── Final weighted formula ────────────────────────────────────────────────
    fraud_score = (0.5 * anomaly_score) + (0.3 * supervised_score) + (0.2 * rule_score)
    fraud_score = max(0.0, min(1.0, fraud_score))

    reasons: list[str] = []
    if delta_distance_m > TELEPORT_DISTANCE_METERS and delta_t_s < TELEPORT_MAX_SECONDS:
        reasons.append("GPS_TELEPORT_PATTERN")
    if (request.history.last_12h_claims or 0) >= 3:
        reasons.append("CLAIM_BURST_12H")
    if shared_driver_count >= 5:
        reasons.append("DEVICE_SHARING_CLUSTER")
    if not reasons:
        reasons.append("MODEL_ANOMALY_SIGNAL")

    shap_explanation = None
    if model_loader.fraud_classifier_model:
        try:
            import shap  # type: ignore

            explainer = shap.TreeExplainer(model_loader.fraud_classifier_model)
            shap_values = explainer.shap_values(np.array([feature_data]))
            values = shap_values[0] if isinstance(shap_values, list) else shap_values
            names = model_loader.fraud_feature_names or feature_names
            feature_impacts = {
                names[i]: float(values[0][i])
                for i in range(min(len(names), values.shape[1]))
            }
            top_signal = max(feature_impacts.items(), key=lambda x: abs(x[1])) if feature_impacts else ("unknown", 0.0)
            shap_explanation = {
                "top_signal": top_signal[0],
                "top_signal_impact": round(float(top_signal[1]), 6),
                "feature_impacts": feature_impacts,
            }
        except Exception:
            shap_explanation = None

    confidence = max(
        abs(fraud_score - 0.5) * 2.0,
        anomaly_score,
        supervised_score,
    )
    confidence = max(0.0, min(1.0, confidence))

    if fraud_score < FRAUD_LABEL_LOW_THRESHOLD:
        label = "LOW"
    elif fraud_score < FRAUD_LABEL_MEDIUM_THRESHOLD or confidence < FRAUD_CONFIDENCE_THRESHOLD:
        label = "MEDIUM"
    else:
        label = "HIGH"

    return FraudScoreResponse(
        score=round(fraud_score, 4),
        label=label,
        confidence=round(confidence, 4),
        fraud_reason=reasons[0],
        explanation=shap_explanation,
    )
