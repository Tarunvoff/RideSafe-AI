import requests
import logging
import os

logger = logging.getLogger(__name__)

class CivicAlertService:
    def __init__(self):
        self.newsapi_key = os.getenv("NEWSAPI_KEY", "demo_key")
        self.news_url = "https://newsapi.org/v2/everything"
        self.disaster_watch_url = "https://disasterwatch.net/api" # Mock URL

    def check_civic_alert(self, city: str) -> bool:
        """ Returns True if there are ongoing civic alerts (bandh, curfew, protests, disasters) """
        try:
            return self._check_news_api(city) or self._check_disaster_watch(city)
        except Exception as e:
            logger.warning(f"Civic alert check failed: {e}")
            return False

    def _check_news_api(self, city: str) -> bool:
        # Mock News API check due to requiring a paid API Key for demo
        # A real implementation would query: q="bandh OR curfew OR protest" AND city
        import random
        # 5% chance of returning True for a mock alert
        return random.random() < 0.05
        
    def _check_disaster_watch(self, city: str) -> bool:
        # Mock disaster watch check
        return False
