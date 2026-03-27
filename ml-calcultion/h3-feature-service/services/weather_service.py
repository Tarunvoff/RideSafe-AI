"""
services/weather_service.py

Async weather fetcher using Open-Meteo API (no API key required).
Ported from: ml_microservice/integrations/weather_service.py

Fetches via the `current` block (live 15-min snapshot):
  - temperature_2m  → temperature (°C)
  - relative_humidity_2m → humidity (%)
  - precipitation → rainfall (mm in current interval)

Also fetches hourly precipitation for the last full hour (better match for ML features).
Falls back to IMD defaults on failure (same as original).
"""

import logging
from datetime import datetime, timezone
import httpx
from config import (
    OPEN_METEO_URL,
    WEATHER_TIMEOUT_SEC,
    DEFAULT_RAINFALL,
    DEFAULT_TEMPERATURE,
    DEFAULT_HUMIDITY,
)

logger = logging.getLogger(__name__)


async def fetch_weather(lat: float, lng: float) -> dict:
    """
    Returns {
        "rainfall": float,     # mm — last full hour or current interval
        "temperature": float,  # °C
        "humidity": float,     # %
    }
    Falls back to safe defaults on any error — matches original IMD fallback.
    """
    params = {
        "latitude": lat,
        "longitude": lng,
        "current": "temperature_2m,relative_humidity_2m,precipitation",
        "hourly": "precipitation",
        "timezone": "auto",
        "forecast_days": 1,
    }

    try:
        async with httpx.AsyncClient(timeout=WEATHER_TIMEOUT_SEC) as client:
            resp = await client.get(OPEN_METEO_URL, params=params)
            resp.raise_for_status()
            body = resp.json()

        # ── Current snapshot (live, interval = 900s) ──────────────────────────
        current = body.get("current", {})
        temperature = current.get("temperature_2m", DEFAULT_TEMPERATURE)
        humidity = current.get("relative_humidity_2m", DEFAULT_HUMIDITY)
        rainfall_cur = current.get("precipitation", DEFAULT_RAINFALL)

        # ── Hourly accumulated for last full hour ─────────────────────────────
        hourly = body.get("hourly", {})
        times = hourly.get("time", [])
        precip_hourly = hourly.get("precipitation", [])

        rainfall_hourly = rainfall_cur
        if times and precip_hourly:
            now_str = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:00")
            past_hours = [(t, p) for t, p in zip(times, precip_hourly) if t <= now_str]
            if past_hours:
                _, rainfall_hourly = past_hours[-1]

        # Prefer hourly (last-hour mm) — matches ml_microservice training feature
        rainfall = rainfall_hourly if rainfall_hourly is not None else rainfall_cur

        logger.info(
            f"Open-Meteo → temp={temperature}°C  humidity={humidity}%  "
            f"rainfall={rainfall} mm/h"
        )
        return {
            "rainfall": round(float(rainfall), 2),
            "temperature": round(float(temperature), 2),
            "humidity": round(float(humidity), 2),
        }

    except Exception as exc:
        logger.warning(f"Open-Meteo failed for ({lat},{lng}): {exc}. Using IMD fallback.")
        return {
            "rainfall": DEFAULT_RAINFALL,
            "temperature": DEFAULT_TEMPERATURE,
            "humidity": DEFAULT_HUMIDITY,
        }
