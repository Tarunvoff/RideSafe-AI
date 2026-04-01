import os
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


def _scaled(value: float, lo: float, hi: float) -> float:
    if value <= lo:
        return 0.0
    if value >= hi:
        return 1.0
    return (value - lo) / (hi - lo)


def calculate_risk_score(request: RiskScoreRequest) -> RiskScoreResponse:
    rainfall = float(request.weather.rainfall)
    aqi = float(request.aqi)
    temperature = float(request.weather.temperature)
    demand_ratio = float(request.demand_ratio)
    historical = float(request.historical_disruption_frequency or 0.0)
    zone_volatility = float(request.zone_volatility or 0.0)
    avg_speed = float(request.avg_speed_kmh or 0.0)

    # Heuristic, real-signal-driven probabilities
    p_rain = _scaled(rainfall, 5.0, 40.0)
    p_aqi  = _scaled(aqi, 70.0, 200.0)
    p_temp = _scaled(temperature, 36.0, 45.0)

    # Demand pressure: orders per rider; >1 means demand > supply
    p_demand = _scaled(demand_ratio, 1.0, 2.0)

    # Speed penalty: sustained low speeds imply congestion and delay risk
    p_speed = _scaled(max(0.0, 25.0 - avg_speed), 5.0, 20.0)

    # Historical disruption and volatility as weak priors
    p_history = min(1.0, max(0.0, historical))
    p_volatility = min(1.0, max(0.0, zone_volatility))

    # Derive correlated flood probability from rainfall
    p_flood = _derive_flood_probability(rainfall, p_rain)

    # ── Correlation Grouping ────────────────────────────────────────────────
    rain_cluster = max(p_rain * SEVERITY_RAIN, p_flood * SEVERITY_FLOOD)
    aqi_cluster  = p_aqi  * SEVERITY_AQI
    temp_cluster = p_temp * SEVERITY_TEMP
    demand_cluster = 0.25 * p_demand
    speed_cluster  = 0.20 * p_speed
    history_cluster = 0.15 * p_history
    volatility_cluster = 0.10 * p_volatility

    current_Lf = 1.0 - (
        (1.0 - rain_cluster) *
        (1.0 - aqi_cluster)  *
        (1.0 - temp_cluster) *
        (1.0 - demand_cluster) *
        (1.0 - speed_cluster) *
        (1.0 - history_cluster) *
        (1.0 - volatility_cluster)
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
        "Risk score for %s: Lf=%.4f (%s) | rain=%.2f aqi=%.2f temp=%.2f demand=%.2f speed=%.2f",
        request.h3_cell, Lf, risk_level, rain_cluster, aqi_cluster, temp_cluster, demand_cluster, speed_cluster
    )

    return RiskScoreResponse(
        Lf=round(Lf, 4),
        risk_level=risk_level
    )
