import requests
import logging
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast"


class WeatherService:
    def __init__(self):
        pass

    def fetch_weather(self, lat: float, lon: float) -> dict:
        """Fetches real-time weather (temperature + precipitation mm) from Open-Meteo."""
        try:
            return self._fetch_open_meteo(lat, lon)
        except Exception as e:
            logger.warning(f"Open-Meteo failed: {e}. Using IMD fallback.")
            return self._fetch_imd_fallback(lat, lon)

    def _fetch_open_meteo(self, lat: float, lon: float) -> dict:
        params = {
            "latitude":  lat,
            "longitude": lon,
            # current fields give us the live snapshot including precipitation
            "current":   "temperature_2m,relative_humidity_2m,precipitation",
            # hourly gives per-hour accumulation; we'll use last full hour
            "hourly":    "precipitation",
            "timezone":  "auto",
            "forecast_days": 1,
        }
        res = requests.get(OPEN_METEO_URL, params=params, timeout=8)
        res.raise_for_status()
        body = res.json()

        # ── Current snapshot (live, interval = 900 s) ─────────────────────────
        current       = body.get("current", {})
        temperature   = current.get("temperature_2m", 0.0)
        humidity      = current.get("relative_humidity_2m", 0.0)
        # `precipitation` in current block = mm fallen in the current interval
        rainfall_cur  = current.get("precipitation", 0.0)

        # ── Hourly accumulated for last full hour ─────────────────────────────
        hourly        = body.get("hourly", {})
        times         = hourly.get("time", [])
        precip_hourly = hourly.get("precipitation", [])

        rainfall_hourly = rainfall_cur  # default to current if hourly unavailable
        if times and precip_hourly:
            now_str = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:00")
            # find the most recent past hour slot
            past_hours = [(t, p) for t, p in zip(times, precip_hourly) if t <= now_str]
            if past_hours:
                _, rainfall_hourly = past_hours[-1]

        # Prefer hourly (last-hour mm) as it matches our training feature better
        rainfall = rainfall_hourly if rainfall_hourly is not None else rainfall_cur

        logger.info(
            f"Open-Meteo → temp={temperature}°C  humidity={humidity}%  "
            f"rainfall={rainfall} mm/h"
        )
        return {
            "temperature": temperature,
            "humidity":    humidity,
            "rainfall":    rainfall,   # mm in last full hour
        }

    def _fetch_imd_fallback(self, lat: float, lon: float) -> dict:
        return {
            "temperature": 29.0,
            "humidity":    65.0,
            "rainfall":    0.0,
        }

