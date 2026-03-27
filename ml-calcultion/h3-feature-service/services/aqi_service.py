"""
services/aqi_service.py

Async AQI fetcher using OpenAQ **v3** API (with API key).
Ported from: ml_microservice/integrations/aqi_service.py

Strategy (identical to original):
  1. Progressive radius search: 10km → 25km → 50km
  2. Discover nearby sensor IDs via /v3/locations
  3. Fetch latest measurements from each sensor via /v3/sensors/{id}/measurements
  4. Average PM2.5 values → convert to US EPA AQI
  5. If no PM2.5 → fall back to PM10 → convert to AQI
  6. CPCB fallback if everything fails

Includes the exact EPA linear interpolation functions from the original.
"""

import math
import logging
import httpx
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

logger = logging.getLogger(__name__)


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


async def _get_sensor_ids(client: httpx.AsyncClient, lat: float, lng: float, radius: int) -> dict:
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


async def _get_latest_value(client: httpx.AsyncClient, sensor_id: int) -> float | None:
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


async def _avg_sensor_type(client: httpx.AsyncClient, sensor_ids: list) -> float | None:
    """Average the latest values across up to N sensors of one type."""
    values = []
    for sid in sensor_ids[:AQI_MAX_SENSORS_PER_TYPE]:
        v = await _get_latest_value(client, sid)
        if v is not None:
            values.append(v)
    return round(sum(values) / len(values), 2) if values else None


async def fetch_aqi(lat: float, lng: float) -> dict:
    """
    Returns {"aqi": float, "pm25": float, "pm10": float}.
    Uses progressive radius search → PM2.5 preferred → PM10 fallback → CPCB default.
    """
    try:
        async with httpx.AsyncClient(timeout=AQI_TIMEOUT_SEC) as client:
            for radius in AQI_SEARCH_RADII:
                ids = await _get_sensor_ids(client, lat, lng, radius)

                pm25 = await _avg_sensor_type(client, ids["pm25"]) if ids["pm25"] else None
                pm10 = await _avg_sensor_type(client, ids["pm10"]) if ids["pm10"] else None

                if pm25 is not None:
                    aqi = _pm25_to_aqi(pm25)
                    pm10 = pm10 if pm10 is not None else round(pm25 * 1.5, 2)
                    logger.info(f"OpenAQ v3 (r={radius}m) PM2.5={pm25} PM10={pm10} AQI={aqi}")
                    return {"aqi": aqi, "pm25": pm25, "pm10": pm10}

                if pm10 is not None:
                    aqi = _pm10_to_aqi(pm10)
                    pm25 = round(pm10 * 0.6, 2)
                    logger.info(f"OpenAQ v3 (r={radius}m) PM10={pm10} (no PM2.5) AQI={aqi}")
                    return {"aqi": aqi, "pm25": pm25, "pm10": pm10}

        logger.warning("OpenAQ v3: no live readings found — using CPCB fallback.")
    except Exception as exc:
        logger.warning(f"OpenAQ v3 failed: {exc}. Using CPCB fallback.")

    return {"aqi": DEFAULT_AQI, "pm25": DEFAULT_PM25, "pm10": DEFAULT_PM10}
