import requests
import redis
import json
import logging
import os

logger = logging.getLogger(__name__)

class GeolocationService:
    def __init__(self):
        self.nominatim_url = "https://nominatim.openstreetmap.org/search"
        self.overpass_url = "https://overpass-api.de/api/interpreter"
        redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")
        self.redis_client = redis.Redis.from_url(redis_url, decode_responses=True)

    def get_coordinates(self, pincode: str) -> dict:
        """ Fetches coordinates, utilizing Redis cache gracefully. """
        cache_key = f"geo:pincode:{pincode}"
        try:
            cached = self.redis_client.get(cache_key)
            if cached:
                logger.info(f"Geolocation cache hit for pincode: {pincode}")
                return json.loads(cached)
        except redis.exceptions.ConnectionError:
            logger.warning("Redis is unreachable. Skipping cache check.")
            
        logger.info(f"Geolocation cache miss (or Redis offline). Fetching from Nominatim for: {pincode}")
        try:
            params = {"q": pincode, "format": "json"}
            headers = {'User-Agent': 'GigShieldApp/1.0'}
            res = requests.get(self.nominatim_url, params=params, headers=headers, timeout=5)
            res.raise_for_status()
            
            data = res.json()
            if len(data) > 0:
                result = {
                    "lat": float(data[0]['lat']),
                    "lon": float(data[0]['lon'])
                }
                # Cache for 24 hours if Redis works
                try:
                    self.redis_client.setex(cache_key, 86400, json.dumps(result))
                except redis.exceptions.ConnectionError:
                    pass
                return result
        except Exception as e:
            logger.error(f"Failed to fetch geolocation for {pincode}: {e}")
        
        # Default/Fallback returning Bangalore center
        return {"lat": 12.9716, "lon": 77.5946}
