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
    # ── Step 1: Validate ──────────────────────────────────────────────────────
    if not validate_h3_cell(h3_cell):
        raise HTTPException(status_code=422, detail=f"Invalid H3 cell ID: '{h3_cell}'")

    # ── Step 2: Cache hit ─────────────────────────────────────────────────────
    cached = get_cached(h3_cell)
    if cached:
        return FeatureResponse(**cached["features"])

    # ── Step 3: H3 → lat/lng ──────────────────────────────────────────────────
    lat, lng = h3_to_latlng(h3_cell)

    # ── Step 4: Parallel async API calls (all 4 in one gather) ────────────────
    try:
        weather_data, aqi_data, civic_alert, platform_data = await asyncio.gather(
            fetch_weather(lat, lng),
            fetch_aqi(lat, lng),
            check_civic_alert(),  # default city = Bangalore
            fetch_platform_activity(h3_cell),
        )
    except Exception as exc:
        logger.error(f"Parallel fetch failed for {h3_cell}: {exc}")
        now = datetime.utcnow()
        return FeatureResponse(
            h3_cell=h3_cell, latitude=lat, longitude=lng,
            rainfall=DEFAULT_RAINFALL, temperature=DEFAULT_TEMPERATURE,
            humidity=DEFAULT_HUMIDITY,
            aqi=DEFAULT_AQI, pm25=DEFAULT_PM25, pm10=DEFAULT_PM10,
            platform_orders=0, active_riders=0,
            demand_ratio=DEFAULT_DEMAND_RATIO,
            civic_alert=False,
            hour_of_day=now.hour, day_of_week=now.weekday(),
            month=now.month, season=_get_season(now.month),
            historical_risk=DEFAULT_HISTORICAL_RISK,
        )

    # ── Step 5: Temporal features (from ml_microservice FeatureEngineering) ───
    now = datetime.utcnow()
    hour_of_day = now.hour
    day_of_week = now.weekday()
    month = now.month
    season = _get_season(month)

    # ── Step 6: Historical risk ───────────────────────────────────────────────
    historical_risk = _generate_historical_risk(h3_cell)

    # ── Step 7: Assemble ──────────────────────────────────────────────────────
    feature_dict = {
        "h3_cell": h3_cell,
        "latitude": round(lat, 6),
        "longitude": round(lng, 6),

        # Weather
        "rainfall": weather_data.get("rainfall", DEFAULT_RAINFALL),
        "temperature": weather_data.get("temperature", DEFAULT_TEMPERATURE),
        "humidity": weather_data.get("humidity", DEFAULT_HUMIDITY),

        # AQI
        "aqi": aqi_data.get("aqi", DEFAULT_AQI),
        "pm25": aqi_data.get("pm25", DEFAULT_PM25),
        "pm10": aqi_data.get("pm10", DEFAULT_PM10),

        # Platform
        "platform_orders": platform_data.get("platform_orders", 0),
        "active_riders": platform_data.get("active_riders", 0),
        "demand_ratio": platform_data.get("demand_ratio", DEFAULT_DEMAND_RATIO),

        # Civic
        "civic_alert": civic_alert,

        # Temporal
        "hour_of_day": hour_of_day,
        "day_of_week": day_of_week,
        "month": month,
        "season": season,

        # Historical
        "historical_risk": historical_risk,
    }

    # ── Step 8: Cache ─────────────────────────────────────────────────────────
    set_cached(h3_cell, feature_dict)

    return FeatureResponse(**feature_dict)
