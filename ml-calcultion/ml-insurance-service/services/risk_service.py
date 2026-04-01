import os
import numpy as np
from utils.model_loader import model_loader
from models.schemas import RiskScoreRequest, RiskScoreResponse
from config import (
    SEVERITY_RAIN, SEVERITY_FLOOD, SEVERITY_AQI, SEVERITY_TEMP,
    FLOOD_RAIN_THRESHOLD,
    RISK_LOW_THRESHOLD, RISK_MEDIUM_THRESHOLD
)
import logging

logger = logging.getLogger(__name__)

# ── Lf Smoothing: Redis-backed (survives restarts) with in-memory fallback ────
_lf_memory_cache: dict[str, float] = {}  # fallback when Redis unavailable
_redis_lf_client = None

def _get_redis_lf():
    global _redis_lf_client
    if _redis_lf_client is not None:
        return _redis_lf_client
    try:
        import redis
        redis_url = os.getenv("REDIS_URL", "redis://127.0.0.1:6379/0")
        _redis_lf_client = redis.Redis.from_url(redis_url, decode_responses=True)
        _redis_lf_client.ping()
        logger.info("risk_service connected to Redis for Lf smoothing")
    except Exception as exc:
        logger.warning("Redis unavailable for Lf smoothing, using in-memory: %s", exc)
        _redis_lf_client = None
    return _redis_lf_client


def _get_previous_lf(h3_cell: str, default: float) -> float:
    r = _get_redis_lf()
    if r:
        try:
            val = r.hget(f"lf:smooth:{h3_cell}", "lf")
            return float(val) if val else default
        except Exception:
            pass
    return _lf_memory_cache.get(h3_cell, default)


def _store_lf(h3_cell: str, lf: float):
    r = _get_redis_lf()
    if r:
        try:
            r.hset(f"lf:smooth:{h3_cell}", mapping={"lf": lf})
            r.expire(f"lf:smooth:{h3_cell}", 3600)  # 1 hour TTL
            return
        except Exception:
            pass
    _lf_memory_cache[h3_cell] = lf

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

    # ── Correlation Grouping ────────────────────────────────────────────────
    rain_cluster = max(p_rain * SEVERITY_RAIN, p_flood * SEVERITY_FLOOD)
    aqi_cluster  = p_aqi  * SEVERITY_AQI
    temp_cluster = p_temp * SEVERITY_TEMP

    current_Lf = 1.0 - (
        (1.0 - rain_cluster) *
        (1.0 - aqi_cluster)  *
        (1.0 - temp_cluster)
    )

    # ── Lf Smoothing (Redis-backed, survives restarts) ────────────────────────
    previous_Lf = _get_previous_lf(request.h3_cell, current_Lf)
    Lf = (0.7 * current_Lf) + (0.3 * previous_Lf)
    _store_lf(request.h3_cell, Lf)
    # ───────────────────────────────────────────────────────────────────────────

    Lf = max(0.0, min(1.0, float(Lf)))

    if Lf < RISK_LOW_THRESHOLD:
        risk_level = "LOW"
    elif Lf < RISK_MEDIUM_THRESHOLD:
        risk_level = "MEDIUM"
    else:
        risk_level = "HIGH"

    logger.info(
        "Risk score for %s: Lf=%.4f (%s) | rain_cluster=%.3f aqi_cluster=%.3f temp_cluster=%.3f",
        request.h3_cell, Lf, risk_level, rain_cluster, aqi_cluster, temp_cluster
    )

    return RiskScoreResponse(
        Lf=round(Lf, 4),
        risk_level=risk_level
    )
