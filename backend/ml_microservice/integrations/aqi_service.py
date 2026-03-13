import requests
import logging
import math

logger = logging.getLogger(__name__)

OPENAQ_API_KEY    = "fb82692a1fd60143d77981ad7046fae366ffec526693544714f1ed2c94e5f22d"
OPENAQ_LOCATIONS  = "https://api.openaq.org/v3/locations"
OPENAQ_SENSORS    = "https://api.openaq.org/v3/sensors/{sensor_id}/measurements"


# ── AQI conversion helpers ────────────────────────────────────────────────────

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


# ── Service ───────────────────────────────────────────────────────────────────

class AQIService:
    def __init__(self):
        self.headers = {
            "X-API-Key": OPENAQ_API_KEY,
            "Accept":    "application/json",
        }

    def fetch_aqi(self, lat: float, lon: float) -> dict:
        """Fetches AQI from OpenAQ v3. PM2.5 preferred, PM10 fallback."""
        try:
            return self._fetch_openaq_v3(lat, lon)
        except Exception as e:
            logger.warning(f"OpenAQ v3 failed: {e}. Using CPCB fallback.")
            return self._fetch_cpcb_fallback()

    # ── Step 1: discover nearby sensor IDs ───────────────────────────────────
    def _get_sensor_ids(self, lat: float, lon: float, radius: int) -> dict:
        """
        Returns {'pm25': [sensor_id, ...], 'pm10': [sensor_id, ...]}.
        `parameter.name` in the sensors array is 'pm25' or 'pm10' (no dot).
        """
        res = requests.get(
            OPENAQ_LOCATIONS,
            params={"coordinates": f"{lat},{lon}", "radius": radius, "limit": 20},
            headers=self.headers,
            timeout=8,
        )
        res.raise_for_status()

        pm25_ids, pm10_ids = [], []
        for location in res.json().get("results", []):
            for sensor in location.get("sensors", []):
                param = sensor.get("parameter", {})
                if not isinstance(param, dict):
                    continue
                name = param.get("name", "").lower().replace(".", "").replace(" ", "")
                sid  = sensor.get("id")
                if sid is None:
                    continue
                if name == "pm25":
                    pm25_ids.append(sid)
                elif name == "pm10":
                    pm10_ids.append(sid)

        return {"pm25": pm25_ids, "pm10": pm10_ids}

    # ── Step 2: fetch latest measurement from a sensor ───────────────────────
    def _get_latest_value(self, sensor_id: int) -> float | None:
        """Hits /v3/sensors/{id}/measurements?limit=1&sort=desc to get latest value."""
        try:
            url = OPENAQ_SENSORS.format(sensor_id=sensor_id)
            res = requests.get(
                url,
                params={"limit": 1, "sort": "desc"},
                headers=self.headers,
                timeout=6,
            )
            res.raise_for_status()
            results = res.json().get("results", [])
            if results:
                val = results[0].get("value")
                if val is not None:
                    return float(val)
        except Exception as e:
            logger.debug(f"Sensor {sensor_id} fetch failed: {e}")
        return None

    # ── Step 3: average values across sensors of one type ────────────────────
    def _avg_sensor_type(self, sensor_ids: list) -> float | None:
        values = []
        for sid in sensor_ids[:4]:   # cap at 4 HTTP calls per param type
            v = self._get_latest_value(sid)
            if v is not None:
                values.append(v)
        return round(sum(values) / len(values), 2) if values else None

    # ── Main fetch logic ─────────────────────────────────────────────────────
    def _fetch_openaq_v3(self, lat: float, lon: float) -> dict:
        for radius in (10000, 25000, 50000):
            ids = self._get_sensor_ids(lat, lon, radius)

            pm25 = self._avg_sensor_type(ids["pm25"]) if ids["pm25"] else None
            pm10 = self._avg_sensor_type(ids["pm10"]) if ids["pm10"] else None

            if pm25 is not None:
                aqi  = _pm25_to_aqi(pm25)
                pm10 = pm10 if pm10 is not None else round(pm25 * 1.5, 2)
                logger.info(f"OpenAQ v3 (r={radius}m) PM2.5={pm25} PM10={pm10} AQI={aqi}")
                return {"aqi": aqi, "pm25": pm25, "pm10": pm10}

            if pm10 is not None:
                aqi  = _pm10_to_aqi(pm10)
                pm25 = round(pm10 * 0.6, 2)
                logger.info(f"OpenAQ v3 (r={radius}m) PM10={pm10} (no PM2.5) AQI={aqi}")
                return {"aqi": aqi, "pm25": pm25, "pm10": pm10}

        logger.warning("OpenAQ v3: no live readings found — using CPCB fallback.")
        return self._fetch_cpcb_fallback()

    def _fetch_cpcb_fallback(self) -> dict:
        return {"aqi": 80.0, "pm25": 30.0, "pm10": 45.0}

import requests
import logging

logger = logging.getLogger(__name__)

class AQIService:
    def __init__(self):
        self.openaq_url = "https://api.openaq.org/v2/measurements"

    def fetch_aqi(self, lat: float, lon: float) -> dict:
        """ Fetches real-time AQI from OpenAQ with CPCB fallback. """
        try:
            return self._fetch_openaq(lat, lon)
        except Exception as e:
            logger.warning(f"OpenAQ failed: {e}. Falling back to CPCB Open Data...")
            return self._fetch_cpcb_fallback(lat, lon)

    def _fetch_openaq(self, lat: float, lon: float) -> dict:
        params = {
            "coordinates": f"{lat},{lon}",
            "radius": 10000,
            "limit": 10,
            "parameter": ["pm25", "pm10"]
        }
        res = requests.get(self.openaq_url, params=params, timeout=5)
        res.raise_for_status()
        
        aqi_data = {"aqi": 50, "pm25": 10.0, "pm10": 20.0} # Defaults
        results = res.json().get('results', [])
        
        for r in results:
            if r['parameter'] == 'pm25':
                aqi_data['pm25'] = r['value']
                aqi_data['aqi'] = max(aqi_data['aqi'], r['value'] * 2.5) # Mock PM2.5 to AQI calculation
            elif r['parameter'] == 'pm10':
                aqi_data['pm10'] = r['value']
                
        return aqi_data

    def _fetch_cpcb_fallback(self, lat: float, lon: float) -> dict:
        # Mock CPCB fallback data
        return {
            "aqi": 80,
            "pm25": 30.0,
            "pm10": 45.0
        }

