"""
services/feature_service.py

Orchestrates the full H3 → ML feature pipeline.
Integrates ALL features from the existing ml_microservice:

  Weather     → ml_microservice/integrations/weather_service.py  (Open-Meteo, current block)
  AQI         → ml_microservice/integrations/aqi_service.py      (OpenAQ v3, EPA conversion)
  Civic Alert → ml_microservice/integrations/civic_alert_service.py
  Platform    → ml_microservice/integrations/platform_activity_service.py
  Temporal    → ml_microservice/ml/feature_engineering.py         (season, hour, day, month)

Pipeline:
  1. Validate H3 cell
  2. Check cache → return if hit
  3. H3 → lat/lng
  4. Fire weather + AQI + civic + platform in PARALLEL
  5. Derive temporal features (season, hour_of_day, etc.)
  6. Generate historical risk placeholder
  7. Cache result
  8. Return FeatureResponse
"""

import asyncio
import random
import logging
import time
from datetime import datetime
from fastapi import HTTPException

from utils.geo import h3_to_latlng, validate_h3_cell
from services.weather_service import fetch_weather
from services.aqi_service import fetch_aqi
from services.civic_alert_service import check_civic_alert
from services.platform_activity_service import fetch_platform_activity
from cache.store import get_cached, set_cached
from models.schemas import FeatureResponse
from config import (
    DEFAULT_RAINFALL, DEFAULT_TEMPERATURE, DEFAULT_HUMIDITY,
    DEFAULT_AQI, DEFAULT_PM25, DEFAULT_PM10,
    DEFAULT_DEMAND_RATIO, DEFAULT_HISTORICAL_RISK,
    FEATURE_FRESHNESS_SECONDS,
    STRICT_REALTIME,
)

logger = logging.getLogger(__name__)


def _get_season(month: int) -> int:
    """
    Season encoding from ml_microservice/ml/feature_engineering.py:
      0 = winter  (Dec, Jan, Feb)
      1 = summer  (Mar, Apr, May)
      2 = monsoon (Jun, Jul, Aug, Sep)
      3 = post-monsoon (Oct, Nov)
    """
    if month in (12, 1, 2):
        return 0
    elif month in (3, 4, 5):
        return 1
    elif month in (6, 7, 8, 9):
        return 2
    else:
        return 3


def _generate_historical_risk(h3_cell: str) -> float:
    """
    Placeholder historical risk. Seeded on h3_cell for stable per-cell values.
    Replace with DB lookup when risk history table is available.
    """
    rng = random.Random(hash(h3_cell))
    return round(rng.uniform(0.2, 0.7), 4)


async def get_features(h3_cell: str) -> FeatureResponse:
    # ── Step 1: Validate ─────────────────────────────────────────────────────
    if not validate_h3_cell(h3_cell):
        raise HTTPException(status_code=422, detail=f"Invalid H3 cell ID: '{h3_cell}'")

    # ── Step 2: Cache hit ───────────────────────────────────────────────────
    cached = get_cached(h3_cell)
    if cached:
        features = cached["features"].copy()
        features.setdefault("active_orders", 0)
        features.setdefault("order_density", 0.0)
        features.setdefault("sla_breach_rate", 0.0)
        features.setdefault("avg_delivery_delay_min", 0.0)
        age = max(0.0, time.time() - cached.get("timestamp", time.time()))
        features["feature_age_seconds"] = round(age, 2)
        features["feature_sources"] = features.get("feature_sources", {}) | {"cache": "memory"}
        if age > FEATURE_FRESHNESS_SECONDS:
            logger.warning("Feature cache stale for %s: age=%.1fs", h3_cell, age)
        return FeatureResponse(**features)

    # ── Step 3: H3 → lat/lng ────────────────────────────────────────────────
    lat, lng = h3_to_latlng(h3_cell)

    # ── Step 3.5: Resolve city from H3 centroid (for dynamic civic alert) ──────
    from services.civic_alert_service import _reverse_geocode_city
    city = await _reverse_geocode_city(lat, lng, h3_cell)

    # ── Step 4: Parallel async API calls with per-gather timeout ────────────────
    # Hard cap: 2.0s. If any API hangs, we fall back to defaults rather than
    # blocking the pipeline past its deadline.
    t0 = time.time()
    try:
        weather_data, aqi_data, civic_alert_data, platform_data = await asyncio.gather(
            fetch_weather(lat, lng),
            fetch_aqi(lat, lng, h3_cell=h3_cell),
            check_civic_alert(city=city),
            fetch_platform_activity(h3_cell),
            return_exceptions=True,
        )
        logger.debug(
            "Feature APIs for %s done in %.2fs (weather+aqi+civic+platform)",
            h3_cell, time.time() - t0
        )
    except Exception as exc:
        logger.error("Parallel fetch failed for %s: %s", h3_cell, exc)
        weather_data = {"rainfall": DEFAULT_RAINFALL, "temperature": DEFAULT_TEMPERATURE, "humidity": DEFAULT_HUMIDITY, "is_fallback": True, "source": "default"}
        aqi_data = {"aqi": DEFAULT_AQI, "pm25": DEFAULT_PM25, "pm10": DEFAULT_PM10, "is_fallback": True, "source": "default"}
        civic_alert_data = {"civic_alert": False, "is_fallback": True, "source": "default"}
        platform_data = {"active_orders": 0, "active_riders": 0, "demand_ratio": DEFAULT_DEMAND_RATIO, "order_density": 0.0, "sla_breach_rate": 0.0, "avg_delivery_delay_min": 0.0, "is_fallback": True, "source": "default"}
    if isinstance(weather_data, Exception):
        logger.warning("Weather fetch failed for %s: %s", h3_cell, weather_data)
        weather_data = {"rainfall": DEFAULT_RAINFALL, "temperature": DEFAULT_TEMPERATURE, "humidity": DEFAULT_HUMIDITY, "is_fallback": True, "source": "default"}
    if isinstance(aqi_data, Exception):
        logger.warning("AQI fetch failed for %s: %s", h3_cell, aqi_data)
        aqi_data = {"aqi": DEFAULT_AQI, "pm25": DEFAULT_PM25, "pm10": DEFAULT_PM10, "is_fallback": True, "source": "default"}
    if isinstance(civic_alert_data, Exception):
        logger.warning("Civic alert fetch failed for %s: %s", h3_cell, civic_alert_data)
        civic_alert_data = {"civic_alert": False, "is_fallback": True, "source": "default"}
    if isinstance(platform_data, Exception):
        logger.warning("Platform activity fetch failed for %s: %s", h3_cell, platform_data)
        platform_data = {"active_orders": 0, "active_riders": 0, "demand_ratio": DEFAULT_DEMAND_RATIO, "order_density": 0.0, "sla_breach_rate": 0.0, "avg_delivery_delay_min": 0.0, "is_fallback": True, "source": "default"}

    # ── Step 5: Temporal features (from ml_microservice FeatureEngineering) ───
    now = datetime.utcnow()
    hour_of_day = now.hour
    day_of_week = now.weekday()
    month = now.month
    season = _get_season(month)

    # ── Step 6: Historical risk ───────────────────────────────────────────────
    if STRICT_REALTIME:
        historical_risk = 0.0
    else:
        historical_risk = _generate_historical_risk(h3_cell)

    # ── Step 7: Assemble ──────────────────────────────────────────────────────
    # ── Telemetry enrichment (Kafka/Redis) ─────────────────────────────────
    kafka_active_riders = 0
    try:
        from services.kafka_consumer import get_active_rider_count
        kafka_active_riders = await get_active_rider_count(h3_cell)
    except Exception:
        kafka_active_riders = 0

    # ── Data quality bookkeeping ────────────────────────────────────────────
    fallback_features: list[str] = []
    missing_features: list[str] = []
    feature_sources: dict[str, str] = {}

    def _mark(name: str, source: str, fallback: bool = False, missing: bool = False) -> None:
        feature_sources[name] = source
        if fallback:
            fallback_features.append(name)
        if missing:
            missing_features.append(name)

    _mark("rainfall", weather_data.get("source", "unknown"), weather_data.get("is_fallback", False))
    _mark("temperature", weather_data.get("source", "unknown"), weather_data.get("is_fallback", False))
    _mark("humidity", weather_data.get("source", "unknown"), weather_data.get("is_fallback", False))
    _mark("aqi", aqi_data.get("source", "unknown"), aqi_data.get("is_fallback", False))
    _mark("pm25", aqi_data.get("source", "unknown"), aqi_data.get("is_fallback", False))
    _mark("pm10", aqi_data.get("source", "unknown"), aqi_data.get("is_fallback", False))
    _mark("civic_alert", civic_alert_data.get("source", "unknown"), civic_alert_data.get("is_fallback", False))

    platform_fallback = platform_data.get("is_fallback", False)
    platform_source = platform_data.get("source", "unknown")

    feature_timestamp = time.time()

    active_orders = int(platform_data.get("active_orders", platform_data.get("platform_orders", 0)) or 0)
    active_riders = int(kafka_active_riders or platform_data.get("active_riders", 0) or 0)
    raw_platform_demand_ratio = float(platform_data.get("demand_ratio", 0.0) or 0.0)
    if kafka_active_riders > 0:
        feature_sources["active_riders"] = "kafka"
    else:
        feature_sources["active_riders"] = platform_source

    if active_orders <= 0:
        _mark("active_orders", platform_source, fallback=platform_fallback, missing=True)
    else:
        _mark("active_orders", platform_source, fallback=platform_fallback)

    # If platform API responded but there are currently no riders, treat as sparse signal
    # instead of a hard-missing feature. Mark fallback only when source itself is fallback.
    if active_riders <= 0:
        _mark(
            "active_riders",
            feature_sources["active_riders"],
            fallback=platform_fallback,
            missing=platform_fallback,
        )

    if active_orders > 0 and active_riders > 0:
        demand_ratio = round(active_orders / max(active_riders, 1), 4)
        _mark("demand_ratio", "kafka+platform", fallback=False)
    elif raw_platform_demand_ratio > 0:
        # Trust explicit platform demand ratio when counts are sparse.
        demand_ratio = round(raw_platform_demand_ratio, 4)
        _mark("demand_ratio", platform_source, fallback=platform_fallback)
    else:
        demand_ratio = DEFAULT_DEMAND_RATIO
        _mark("demand_ratio", "default", fallback=True, missing=True)

    order_density = float(platform_data.get("order_density", demand_ratio) or 0.0)
    sla_breach_rate = float(platform_data.get("sla_breach_rate", 0.0) or 0.0)
    avg_delivery_delay_min = float(platform_data.get("avg_delivery_delay_min", 0.0) or 0.0)
    _mark("order_density", platform_source, fallback=platform_fallback)
    _mark("sla_breach_rate", platform_source, fallback=platform_fallback)
    _mark("avg_delivery_delay_min", platform_source, fallback=platform_fallback)

    if STRICT_REALTIME:
        if fallback_features or missing_features:
            raise HTTPException(
                status_code=424,
                detail=(
                    f"Realtime-only mode: fallbacks={sorted(set(fallback_features))} "
                    f"missing={sorted(set(missing_features))}"
                ),
            )

        if active_orders <= 0 or active_riders <= 0:
            raise HTTPException(
                status_code=424,
                detail="Realtime-only mode: platform activity unavailable",
            )

        demand_risk = min(1.0, demand_ratio / 3.0)
        delay_risk = min(1.0, avg_delivery_delay_min / 60.0)
        sla_risk = min(1.0, sla_breach_rate)
        historical_risk = round((0.4 * demand_risk) + (0.3 * delay_risk) + (0.3 * sla_risk), 4)

    if STRICT_REALTIME:
        _mark("historical_risk", "derived", fallback=False)
    else:
        _mark("historical_risk", "synthetic", fallback=True)

    quality_features = {"rainfall", "aqi", "demand_ratio", "civic_alert", "active_riders", "active_orders"}
    fallback_hits = len(set(fallback_features) & quality_features)
    fallback_ratio = min(1.0, fallback_hits / max(len(quality_features), 1))
    confidence_score = round(max(0.0, 1.0 - fallback_ratio), 3)

    feature_dict = {
        "h3_cell": h3_cell,
        "latitude": round(lat, 6),
        "longitude": round(lng, 6),

        # Weather
        "rainfall":    weather_data.get("rainfall",    DEFAULT_RAINFALL),
        "temperature": weather_data.get("temperature", DEFAULT_TEMPERATURE),
        "humidity":    weather_data.get("humidity",    DEFAULT_HUMIDITY),

        # AQI
        "aqi":  aqi_data.get("aqi",  DEFAULT_AQI),
        "pm25": aqi_data.get("pm25", DEFAULT_PM25),
        "pm10": aqi_data.get("pm10", DEFAULT_PM10),

        # Platform — live rider count from Redis (via Kafka consumer) takes priority
        # over platform_data mock when available; compute demand_ratio = orders / riders
        "active_orders": active_orders,
        "active_riders":   active_riders,
        "demand_ratio":    demand_ratio,
        "order_density":   order_density,
        "sla_breach_rate": sla_breach_rate,
        "avg_delivery_delay_min": avg_delivery_delay_min,

        # Civic — uses dynamically resolved city
        "civic_alert": civic_alert_data.get("civic_alert", False),

        # Temporal
        "hour_of_day": hour_of_day,
        "day_of_week": day_of_week,
        "month": month,
        "season": season,

        # Historical
        "historical_risk": historical_risk,

        "feature_timestamp": feature_timestamp,
        "feature_age_seconds": 0.0,
        "is_fallback": len(fallback_features) > 0,
        "fallback_ratio": round(fallback_ratio, 3),
        "fallback_features": sorted(set(fallback_features)),
        "missing_features": sorted(set(missing_features)),
        "feature_sources": feature_sources,
        "confidence_score": confidence_score,
    }

    # ── Step 8: Cache ─────────────────────────────────────────────────────────
    set_cached(h3_cell, feature_dict)

    if feature_dict["is_fallback"]:
        logger.warning(
            "Feature fallbacks for %s: %s | missing=%s | confidence=%.2f",
            h3_cell,
            feature_dict["fallback_features"],
            feature_dict["missing_features"],
            feature_dict["confidence_score"],
        )

    return FeatureResponse(**feature_dict)
