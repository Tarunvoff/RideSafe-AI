"""
services/aqi_service.py

Async AQI fetcher using OpenAQ **v3** API (with API key).
Ported from: ml_microservice/integrations/aqi_service.py

Strategy (identical to original):
  1. Progressive radius search: 10km → 25km → 50km
  2. Discover nearby sensor IDs via /v3/locations
  3. Fetch latest measurements from each sensor via /v3/sensors/{id}/measurements
  4. Average PM2.5 values → convert to US EPA AQI (PARALLELISED with asyncio.gather)
  5. If no PM2.5 → fall back to PM10 → convert to AQI
  6. CPCB fallback if everything fails

Includes the exact EPA linear interpolation functions from the original.
"""

import asyncio
import math
import logging
from config import (
    OPENAQ_API_KEY,
    OPENAQ_LOCATIONS,
    OPENAQ_SENSORS_URL,
    AQI_TIMEOUT_SEC,
    AQI_SEARCH_RADII,
    AQI_MAX_SENSORS_PER_TYPE,
    DEFAULT_AQI,
    DEFAULT_PM25,
    DEFAULT_PM10,
)
from services.apiris_http import AdaptiveAsyncClient

logger = logging.getLogger(__name__)


def _has_valid_openaq_key() -> bool:
    key = (OPENAQ_API_KEY or "").strip()
    if not key:
        return False
    lowered = key.lower()
    return "your_" not in lowered and "_here" not in lowered


# ── AQI conversion helpers (from original aqi_service.py) ─────────────────────

def _pm25_to_aqi(c: float) -> float:
    """US EPA linear interpolation for PM2.5 (µg/m³) → AQI."""
    bp = [
        (0.0,    12.0,   0,   50),
        (12.1,   35.4,  51,  100),
        (35.5,   55.4, 101,  150),
        (55.5,  150.4, 151,  200),
        (150.5, 250.4, 201,  300),
        (250.5, 350.4, 301,  400),
        (350.5, 500.4, 401,  500),
    ]
    c = round(c, 1)
    for c_lo, c_hi, i_lo, i_hi in bp:
        if c_lo <= c <= c_hi:
            return round(((i_hi - i_lo) / (c_hi - c_lo)) * (c - c_lo) + i_lo, 1)
    return 500.0


def _pm10_to_aqi(c: float) -> float:
    """US EPA linear interpolation for PM10 (µg/m³) → AQI."""
    bp = [
        (0,    54,   0,   50),
        (55,  154,  51,  100),
        (155, 254, 101,  150),
        (255, 354, 151,  200),
        (355, 424, 201,  300),
        (425, 504, 301,  400),
        (505, 604, 401,  500),
    ]
    c = math.floor(c)
    for c_lo, c_hi, i_lo, i_hi in bp:
        if c_lo <= c <= c_hi:
            return round(((i_hi - i_lo) / (c_hi - c_lo)) * (c - c_lo) + i_lo, 1)
    return 500.0


# ── Async OpenAQ v3 Service ──────────────────────────────────────────────────

_HEADERS = {
    "X-API-Key": OPENAQ_API_KEY,
    "Accept": "application/json",
}


async def _get_sensor_ids(client, lat: float, lng: float, radius: int) -> dict:
    """
    Discover nearby sensor IDs for PM2.5 and PM10.
    Returns {'pm25': [sid, ...], 'pm10': [sid, ...]}.
    """
    resp = await client.get(
        OPENAQ_LOCATIONS,
        params={"coordinates": f"{lat},{lng}", "radius": radius, "limit": 20},
        headers=_HEADERS,
    )
    resp.raise_for_status()

    pm25_ids, pm10_ids = [], []
    for location in resp.json().get("results", []):
        for sensor in location.get("sensors", []):
            param = sensor.get("parameter", {})
            if not isinstance(param, dict):
                continue
            name = param.get("name", "").lower().replace(".", "").replace(" ", "")
            sid = sensor.get("id")
            if sid is None:
                continue
            if name == "pm25":
                pm25_ids.append(sid)
            elif name == "pm10":
                pm10_ids.append(sid)

    return {"pm25": pm25_ids, "pm10": pm10_ids}


async def _get_latest_value(client, sensor_id: int) -> float | None:
    """Fetch latest measurement from a single sensor."""
    try:
        url = OPENAQ_SENSORS_URL.format(sensor_id=sensor_id)
        resp = await client.get(url, params={"limit": 1, "sort": "desc"}, headers=_HEADERS)
        resp.raise_for_status()
        results = resp.json().get("results", [])
        if results:
            val = results[0].get("value")
            if val is not None:
                return float(val)
    except Exception as e:
        logger.debug(f"Sensor {sensor_id} fetch failed: {e}")
    return None


async def _avg_sensor_type(client, sensor_ids: list) -> float | None:
    """Fetch latest values for up to N sensors IN PARALLEL using asyncio.gather."""
    limited = sensor_ids[:AQI_MAX_SENSORS_PER_TYPE]
    if not limited:
        return None
    results = await asyncio.gather(
        *[_get_latest_value(client, sid) for sid in limited],
        return_exceptions=True,
    )
    values = [v for v in results if isinstance(v, float)]
    return round(sum(values) / len(values), 2) if values else None


# ── Per-H3-cell AQI cache (in-memory, 10-minute TTL) ─────────────────────────
import time as _time
_aqi_cache: dict = {}   # {"h3_cell": {"data": dict, "expires": float}}
_AQI_CACHE_TTL = 600    # 10 minutes


def _aqi_cache_get(h3_cell: str) -> dict | None:
    entry = _aqi_cache.get(h3_cell)
    if entry and entry["expires"] > _time.time():
        return entry["data"]
    return None


def _aqi_cache_set(h3_cell: str, data: dict):
    _aqi_cache[h3_cell] = {"data": data, "expires": _time.time() + _AQI_CACHE_TTL}


async def fetch_aqi(lat: float, lng: float, h3_cell: str | None = None) -> dict:
    """
    Returns {"aqi": float, "pm25": float, "pm10": float, "is_fallback": bool, "source": str}.
    Strategy: parallel sensor fetches → progressive radius → PM2.5 preferred → CPCB fallback.
    Per-H3-cell cache with 10-minute TTL avoids redundant API calls.
    """
    # Check cell-level cache first
    if h3_cell:
        cached = _aqi_cache_get(h3_cell)
        if cached:
            logger.debug("AQI cache hit for H3 cell %s", h3_cell)
            return cached

    if not _has_valid_openaq_key():
        logger.info("OpenAQ API key missing/placeholder. Using CPCB fallback.")
        return {
            "aqi": DEFAULT_AQI,
            "pm25": DEFAULT_PM25,
            "pm10": DEFAULT_PM10,
            "is_fallback": True,
            "source": "default",
        }

    try:
        async with AdaptiveAsyncClient(timeout=AQI_TIMEOUT_SEC, source="openaq-v3") as client:
            for radius in AQI_SEARCH_RADII:
                try:
                    ids = await _get_sensor_ids(client, lat, lng, radius)

                    # Fetch PM2.5 and PM10 sensors IN PARALLEL across the radius
                    async def _none_coro(): return None
                    pm25_task = _avg_sensor_type(client, ids["pm25"]) if ids["pm25"] else _none_coro()
                    pm10_task = _avg_sensor_type(client, ids["pm10"]) if ids["pm10"] else _none_coro()
                    pm25, pm10 = await asyncio.gather(pm25_task, pm10_task, return_exceptions=True)
                    pm25 = pm25 if isinstance(pm25, float) else None
                    pm10 = pm10 if isinstance(pm10, float) else None

                    if pm25 is not None:
                        aqi  = _pm25_to_aqi(pm25)
                        pm10 = pm10 if pm10 is not None else round(pm25 * 1.5, 2)
                        logger.info("OpenAQ v3 (r=%dm) PM2.5=%.1f PM10=%.1f AQI=%.1f", radius, pm25, pm10, aqi)
                        result = {"aqi": aqi, "pm25": pm25, "pm10": pm10, "is_fallback": False, "source": "openaq"}
                        if h3_cell:
                            _aqi_cache_set(h3_cell, result)
                        return result

                    if pm10 is not None:
                        aqi  = _pm10_to_aqi(pm10)
                        pm25 = round(pm10 * 0.6, 2)
                        logger.info("OpenAQ v3 (r=%dm) PM10=%.1f (no PM2.5) AQI=%.1f", radius, pm10, aqi)
                        result = {"aqi": aqi, "pm25": pm25, "pm10": pm10, "is_fallback": False, "source": "openaq"}
                        if h3_cell:
                            _aqi_cache_set(h3_cell, result)
                        return result

                except asyncio.TimeoutError:
                    logger.warning("AQI timeout at radius=%dm — trying next radius", radius)
                    continue

        logger.warning("OpenAQ v3: no live readings found — using CPCB fallback.")
    except Exception as exc:
        logger.warning("OpenAQ v3 failed: %s. Using CPCB fallback.", exc)

    return {"aqi": DEFAULT_AQI, "pm25": DEFAULT_PM25, "pm10": DEFAULT_PM10, "is_fallback": True, "source": "default"}
