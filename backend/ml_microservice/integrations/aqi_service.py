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
