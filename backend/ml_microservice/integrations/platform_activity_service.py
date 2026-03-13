import requests
import random
import logging

logger = logging.getLogger(__name__)

class PlatformActivityService:
    def __init__(self):
        self.mock_api_url = "http://localhost:8000/api/platform-activity" # Concept mock

    def fetch_platform_activity(self, zone: str) -> dict:
        """ Simulates active riders, orders assigned, and platform outage status. """
        try:
            # We will just generate realistic mock data here instead of actually 
            # hitting localhost because the localhost endpoint may not exist yet.
            return self._mock_activity(zone)
        except Exception as e:
            logger.error(f"Platform activity fetch failed: {e}")
            return {"platform_orders": 0, "active_riders": 0}

    def _mock_activity(self, zone: str) -> dict:
        orders = random.randint(10, 200)
        riders = max(5, int(orders * random.uniform(0.3, 0.8)))
        return {
            "platform_orders": orders,
            "active_riders": riders
        }
