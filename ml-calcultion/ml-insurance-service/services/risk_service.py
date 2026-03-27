import numpy as np
from utils.model_loader import model_loader
from models.schemas import RiskScoreRequest, RiskScoreResponse
from config import (
    SEVERITY_RAIN, SEVERITY_FLOOD, SEVERITY_AQI, SEVERITY_TEMP,
    FLOOD_RAIN_THRESHOLD,
    RISK_LOW_THRESHOLD, RISK_MEDIUM_THRESHOLD
)

# In-memory storage for Lf smoothing (per H3 cell)
# In production, this should be a Redis key or DB entry.
_lf_history_cache: dict[str, float] = {}

def _derive_flood_probability(rainfall: float, p_rain: float) -> float:
    """
    Flood is a CORRELATED event with rain — not independent.
    Derive P_flood from rainfall intensity + rain model probability.
    
    Logic:
      - If rainfall < 20: p_flood = 0
      - else: p_flood = min(1.0, rainfall / 100)
    """
    if rainfall < 20:
        return 0.0
    return float(min(1.0, rainfall / 100.0))


def calculate_risk_score(request: RiskScoreRequest) -> RiskScoreResponse:
    # Feature vector: [rainfall, aqi, temperature, demand_ratio, historical_freq, zone_volatility]
    features = np.array([[
        request.weather.rainfall,
        request.aqi,
        request.weather.temperature,
        request.demand_ratio,
        request.historical_disruption_frequency,
        request.zone_volatility
    ]])

    models = model_loader.risk_models
    if not models:
        raise RuntimeError(
            "Risk XGBoost models not loaded. Run train_models.py before starting the server."
        )

    # Pi — disruption probabilities from XGBoost classifiers
    p_rain = float(models['rain'].predict_proba(features)[0][1])
    p_aqi  = float(models['aqi'].predict_proba(features)[0][1])
    p_temp = float(models['temp'].predict_proba(features)[0][1])

    # Derive correlated flood probability from rainfall
    p_flood = _derive_flood_probability(request.weather.rainfall, p_rain)

    # ── FIX: Correlation Grouping ──────────────────────────────────────────────
    # Rain and flood are NOT independent — heavy rain causes flooding.
    # Group them into a single "rain_cluster" using max() to avoid double-counting.
    # This prevents underestimating risk by treating them as separate multiplications.
    #
    #   rain_cluster = max(P_rain × S_rain, P_flood × S_flood)
    #   aqi_cluster  = P_aqi × S_aqi
    #   temp_cluster = P_temp × S_temp
    #
    # Lf = 1 - (1 - rain_cluster)(1 - aqi_cluster)(1 - temp_cluster)
    # ──────────────────────────────────────────────────────────────────────────
    rain_cluster = max(p_rain * SEVERITY_RAIN, p_flood * SEVERITY_FLOOD)
    aqi_cluster  = p_aqi  * SEVERITY_AQI
    temp_cluster = p_temp * SEVERITY_TEMP

    current_Lf = 1.0 - (
        (1.0 - rain_cluster) *
        (1.0 - aqi_cluster)  *
        (1.0 - temp_cluster)
    )

    # ── FIX: Lf Smoothing ─────────────────────────────────────────────────────
    # Lf = 0.7 * current_Lf + 0.3 * previous_Lf
    previous_Lf = _lf_history_cache.get(request.h3_cell, current_Lf)
    Lf = (0.7 * current_Lf) + (0.3 * previous_Lf)
    
    # Store for next computation
    _lf_history_cache[request.h3_cell] = Lf
    # ──────────────────────────────────────────────────────────────────────────

    Lf = max(0.0, min(1.0, float(Lf)))

    if Lf < RISK_LOW_THRESHOLD:
        risk_level = "LOW"
    elif Lf < RISK_MEDIUM_THRESHOLD:
        risk_level = "MEDIUM"
    else:
        risk_level = "HIGH"

    return RiskScoreResponse(
        Lf=round(Lf, 4),
        risk_level=risk_level
    )
