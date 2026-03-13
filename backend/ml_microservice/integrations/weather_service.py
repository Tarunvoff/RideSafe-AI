import requests
import logging

logger = logging.getLogger(__name__)

class WeatherService:
    def __init__(self):
        self.open_meteo_url = "https://api.open-meteo.com/v1/forecast"
        self.rainviewer_url = "https://api.rainviewer.com/public/weather-maps.json"
        
    def fetch_weather(self, lat: float, lon: float) -> dict:
        """ Fetches real-time weather from Open-Meteo with IMD/RainViewer fallbacks (mocked) """
        try:
            return self._fetch_open_meteo(lat, lon)
        except Exception as e:
            logger.warning(f"Open-Meteo failed: {e}. Falling back to RainViewer...")
            try:
                return self._fetch_rainviewer_fallback(lat, lon)
            except Exception as e2:
                logger.warning(f"RainViewer failed: {e2}. Falling back to IMD...")
                return self._fetch_imd_fallback(lat, lon)

    def _fetch_open_meteo(self, lat: float, lon: float) -> dict:
        params = {
            "latitude": lat,
            "longitude": lon,
            "current": "temperature_2m,relative_humidity_2m,precipitation",
            "timezone": "auto"
        }
        res = requests.get(self.open_meteo_url, params=params, timeout=5)
        res.raise_for_status()
        data = res.json().get('current', {})
        return {
            "temperature": data.get('temperature_2m', 0.0),
            "humidity": data.get('relative_humidity_2m', 0.0),
            "rainfall": data.get('precipitation', 0.0)
        }
        
    def _fetch_rainviewer_fallback(self, lat: float, lon: float) -> dict:
        # Mock RainViewer / IMD fallback
        return {
            "temperature": 28.0,
            "humidity": 60.0,
            "rainfall": 5.0
        }

    def _fetch_imd_fallback(self, lat: float, lon: float) -> dict:
        return {
            "temperature": 29.0,
            "humidity": 65.0,
            "rainfall": 0.0
        }
