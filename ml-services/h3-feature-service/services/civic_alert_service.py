"""
services/civic_alert_service.py

Async civic alert detection (bandh, curfew, protests, disasters).
Ported from: ml_microservice/integrations/civic_alert_service.py

Uses Newsdata.io to search for disruption-related news in the reverse-geocoded city.
City is derived dynamically from H3 cell centroid via reverse geocoding.
Returns a boolean: True if civic disruption is ongoing.
"""

import logging
import asyncio
import httpx
from config import NEWSDATA_API_KEY, NEWSDATA_URL, USE_CALIBRATED_FALLBACK_PRIOR
from services.apiris_http import AdaptiveAsyncClient

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
        async with AdaptiveAsyncClient(timeout=5.0, source="nominatim-reverse-geocode") as client:
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
    Enforces a fail-closed architecture: never produces baseline defaults if API fails or keys are missing.
    """
    # ── Step 1: Enforce Environment Integrity ──────────────────────────────────
    if not NEWSDATA_API_KEY or NEWSDATA_API_KEY == "demo_key":
        logger.error("INGESTION_CRITICAL: NewsData API Key is missing or invalid. Aborting civic check for %s.", city)
        return {"civic_alert": False, "is_fallback": True, "source": "fail_closed_config"}

    try:
        params = {
            "apikey": NEWSDATA_API_KEY,
            "category": "domestic",
            "language": "en,ta",
            "q": f"({city}) AND (strike OR protest OR flood OR curfew OR bandh OR cyclone)"
        }
        async with AdaptiveAsyncClient(timeout=8.0, source="newsdata-civic-alert") as client:
            resp = await client.get(NEWSDATA_URL, params=params)
            
            # Explicitly log 5xx errors from the upstream provider
            if resp.status_code >= 500:
                logger.error("UPSTREAM_ERROR: NewsData.io returned HTTP %d for %s. Aborting run.", resp.status_code, city)
                return {"civic_alert": False, "is_fallback": True, "source": "fail_closed_upstream"}

            resp.raise_for_status()
            data = resp.json()

            if data.get("status") == "error":
                logger.error("API_VALIDATION_ERROR: %s", data.get("message", "Unknown error"))
                return {"civic_alert": False, "is_fallback": True, "source": "fail_closed_api"}

            total = data.get("totalResults", 0)
            if total > 0:
                logger.info("Civic alert verified for %s: %d results", city, total)
                return {"civic_alert": True, "is_fallback": False, "source": "newsdata"}
            
            return {"civic_alert": False, "is_fallback": False, "source": "newsdata"}

    except (httpx.TimeoutException, asyncio.TimeoutError, TimeoutError):
        logger.error("NETWORK_TIMEOUT: NewsData.io timed out for %s. Fail-closed to False.", city)
        return {"civic_alert": False, "is_fallback": True, "source": "fail_closed_timeout"}
    except Exception as exc:
        logger.critical("UNEXPECTED_PIPELINE_ERROR during civic alert check for %s: %s", city, exc)
        return {"civic_alert": False, "is_fallback": True, "source": "fail_closed_critical"}
