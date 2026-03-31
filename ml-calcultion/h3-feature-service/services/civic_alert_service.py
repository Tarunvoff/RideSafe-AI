"""
services/civic_alert_service.py

Async civic alert detection (bandh, curfew, protests, disasters).
Ported from: ml_microservice/integrations/civic_alert_service.py

Uses NewsAPI to search for disruption-related news in the reverse-geocoded city.
Returns a boolean: True if civic disruption is ongoing.
"""

import logging
import httpx
from config import NEWSAPI_KEY, NEWSAPI_URL

logger = logging.getLogger(__name__)

import os

USE_MOCK_DATA = os.getenv("USE_MOCK_DATA", "True").lower() == "true"

async def check_civic_alert(city: str = "Bangalore") -> bool:
    """
    Returns True if there are ongoing civic alerts affecting gig workers.
    Based on existing ml_microservice logic.

    In production: queries NewsAPI for "bandh OR curfew OR protest" in the city.
    Currently: mock implementation (5% chance) toggled via USE_MOCK_DATA.
    """
    try:
        if USE_MOCK_DATA or NEWSAPI_KEY == "demo_key":
            # Mock mode — same as original CivicAlertService._check_news_api
            import random
            return random.random() < 0.05

        params = {
            "q": f"({city}) AND (bandh OR curfew OR protest OR flood OR disaster)",
            "sortBy": "publishedAt",
            "pageSize": 5,
            "apiKey": NEWSAPI_KEY,
        }
        async with httpx.AsyncClient(timeout=6.0) as client:
            resp = await client.get(NEWSAPI_URL, params=params)
            resp.raise_for_status()
            data = resp.json()
            total = data.get("totalResults", 0)
            if total > 0:
                logger.info(f"Civic alert detected for {city}: {total} results")
                return True
            return False

    except Exception as exc:
        logger.warning(f"Civic alert check failed: {exc}")
        return False
