"""
services/civic_alert_service.py

Async civic alert detection (bandh, curfew, protests, disasters).
Ported from: ml_microservice/integrations/civic_alert_service.py

Uses NewsAPI to search for disruption-related news in the reverse-geocoded city.
Returns a boolean: True if civic disruption is ongoing.
"""

import logging
import httpx
from config import NEWSDATA_API_KEY, NEWSDATA_URL, USE_MOCK_DATA

logger = logging.getLogger(__name__)

async def check_civic_alert(city: str = "Bangalore") -> bool:
    """
    Returns True if there are ongoing civic alerts affecting gig workers.
    Uses Newsdata.io directly based on the user's platform integration.

    Currently: mock implementation (5% chance) toggled via USE_MOCK_DATA.
    """
    try:
        if USE_MOCK_DATA or NEWSDATA_API_KEY == "demo_key":
            # Mock mode — safely avoids consuming API keys during local testing
            import random
            return random.random() < 0.05

        # Format matches the NestJS backend ingestion logic perfectly
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
                logger.info(f"Civic alert detected for {city}: {total} results")
                return True
            return False

    except Exception as exc:
        logger.warning(f"Civic alert check failed: {exc}")
        return False
