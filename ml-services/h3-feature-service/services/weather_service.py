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
import os
from datetime import datetime, timezone
from config import (
    OPEN_METEO_URL,
    WEATHER_TIMEOUT_SEC,
    OPEN_WEATHER_API_KEY,
    DEFAULT_RAINFALL,
    DEFAULT_TEMPERATURE,
    DEFAULT_HUMIDITY,
)
from services.apiris_http import AdaptiveAsyncClient

logger = logging.getLogger(__name__)

OPEN_WEATHER_URL = "https://api.openweathermap.org/data/2.5/weather"


def _has_valid_openweather_key() -> bool:
    key = (OPEN_WEATHER_API_KEY or "").strip()
    if not key:
        return False
    lowered = key.lower()
    return "your_" not in lowered and "_here" not in lowered

async def fetch_weather_from_openweather(lat: float, lng: float) -> dict | None:
    if not _has_valid_openweather_key():
        return None
        
    params = {
        "lat": lat,
        "lon": lng,
        "appid": OPEN_WEATHER_API_KEY,
        "units": "metric"
    }
    
    try:
        async with AdaptiveAsyncClient(timeout=WEATHER_TIMEOUT_SEC, source="open-weather-map") as client:
            resp = await client.get(OPEN_WEATHER_URL, params=params)
            resp.raise_for_status()
            data = resp.json()
            
            # OpenWeatherMap current weather mapping
            temperature = data.get("main", {}).get("temp", DEFAULT_TEMPERATURE)
            humidity = data.get("main", {}).get("humidity", DEFAULT_HUMIDITY)
            
            # Rainfall is optional in OWM response (rain.1h or rain.3h)
            rainfall = data.get("rain", {}).get("1h", 0.0)
            
            logger.info(f"OpenWeatherMap → temp={temperature}°C humidity={humidity}% rainfall={rainfall}mm")
            return {
                "rainfall": round(float(rainfall), 2),
                "temperature": round(float(temperature), 2),
                "humidity": round(float(humidity), 2),
                "is_fallback": False,
                "source": "open-weather-map",
            }
    except Exception as exc:
        logger.warning(f"OpenWeatherMap failed for ({lat},{lng}): {exc}")
        return None

async def fetch_weather_from_openmeteo(lat: float, lng: float) -> dict | None:
    params = {
        "latitude": lat,
        "longitude": lng,
        "current": "temperature_2m,relative_humidity_2m,precipitation",
        "hourly": "precipitation",
        "timezone": "auto",
        "forecast_days": 1,
    }

    try:
        async with AdaptiveAsyncClient(timeout=WEATHER_TIMEOUT_SEC, source="open-meteo") as client:
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
            "is_fallback": False,
            "source": "open-meteo",
        }
    except Exception as exc:
        logger.warning(f"Open-Meteo failed for ({lat},{lng}): {exc}")
        return None

async def fetch_weather(lat: float, lng: float) -> dict:
    """
    Returns weather data with a prioritized hierarchy:
    1. OpenWeatherMap (requires API key)
    2. Open-Meteo (Fallback source)
    3. Safe Defaults (Absolute Fallback)
    """
    # 1. Try OpenWeatherMap
    result = await fetch_weather_from_openweather(lat, lng)
    if result:
        return result
        
    # 2. Try Open-Meteo
    result = await fetch_weather_from_openmeteo(lat, lng)
    if result:
        return result

    # 3. Safe Defaults
    logger.error(f"All weather providers failed for ({lat},{lng}). Using absolute defaults.")
    return {
        "rainfall": DEFAULT_RAINFALL,
        "temperature": DEFAULT_TEMPERATURE,
        "humidity": DEFAULT_HUMIDITY,
        "is_fallback": True,
        "source": "default-system-fallback",
    }
