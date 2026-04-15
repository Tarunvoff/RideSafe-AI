"""
services/civic_alert_service.py

Async civic alert detection (bandh, curfew, protests, disasters).
Ported from: ml_microservice/integrations/civic_alert_service.py

Uses Newsdata.io to search for disruption-related news in the reverse-geocoded city.
City is derived dynamically from H3 cell centroid via reverse geocoding.
Returns a boolean: True if civic disruption is ongoing.
"""

import logging
import httpx
from config import NEWSDATA_API_KEY, NEWSDATA_URL, USE_CALIBRATED_FALLBACK_PRIOR

logger = logging.getLogger(__name__)

# ── City lookup from lat/lng via Nominatim (OpenStreetMap, free, no API key) ──
_city_cache: dict[str, str] = {}  # h3_cell → city name

async def _reverse_geocode_city(lat: float, lng: float, h3_cell: str) -> str:
    """
    Reverse-geocode lat/lng → city name using OSM Nominatim.
    Caches result per h3_cell (stable centroid → stable city).
    Falls back to 'Bangalore' on any failure.
    """
    if h3_cell in _city_cache:
        return _city_cache[h3_cell]
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(
                "https://nominatim.openstreetmap.org/reverse",
                params={"lat": lat, "lon": lng, "format": "json"},
                headers={"User-Agent": "Aegis-AI/1.0"},
            )
            resp.raise_for_status()
            data = resp.json()
            addr = data.get("address", {})
            # Prefer city > town > county > state
            city = (
                addr.get("city")
                or addr.get("town")
                or addr.get("county")
                or addr.get("state")
                or "Bangalore"
            )
            _city_cache[h3_cell] = city
            logger.info("Reverse geocoded H3 %s → city=%s", h3_cell, city)
            return city
    except Exception as exc:
        logger.warning("Reverse geocoding failed for %s: %s — defaulting to Bangalore", h3_cell, exc)
        return "Bangalore"


async def check_civic_alert(city: str = "Bangalore") -> dict:
    """
    Returns {"civic_alert": bool, "is_fallback": bool, "source": str}.
    Uses Newsdata.io directly based on the user's platform integration.
    City is derived dynamically (passed from feature_service via _reverse_geocode_city).
    """
    try:
        if USE_CALIBRATED_FALLBACK_PRIOR or not NEWSDATA_API_KEY:
            import random
            return {"civic_alert": random.random() < 0.05, "is_fallback": True, "source": "calibrated_fallback_prior"}

        params = {
            "apikey": NEWSDATA_API_KEY,
            "category": "domestic",
            "language": "en,ta",
            "q": f"({city}) AND (strike OR protest OR flood OR curfew OR bandh OR cyclone)"
        }
        async with httpx.AsyncClient(timeout=8.0) as client:
            resp = await client.get(NEWSDATA_URL, params=params)
            resp.raise_for_status()
            data = resp.json()
            total = data.get("totalResults", 0)
            if total > 0:
                logger.info("Civic alert detected for %s: %d results", city, total)
                return {"civic_alert": True, "is_fallback": False, "source": "newsdata"}
            return {"civic_alert": False, "is_fallback": False, "source": "newsdata"}

    except Exception as exc:
        logger.warning("Civic alert check failed for %s: %s", city, exc)
        return {"civic_alert": False, "is_fallback": True, "source": "default"}
