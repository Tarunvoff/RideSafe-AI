import requests
from datetime import datetime

class DataCollector:
    def __init__(self):
        self.meteo_url = "https://api.open-meteo.com/v1/forecast"
        self.openaq_url = "https://api.openaq.org/v2/measurements"
        self.nominatim_url = "https://nominatim.openstreetmap.org/search"

    def get_coordinates(self, pincode: str):
        params = {"q": pincode, "format": "json"}
        headers = {'User-Agent': 'GigShieldML/1.0'}
        response = requests.get(self.nominatim_url, params=params, headers=headers)
        if response.status_code == 200 and len(response.json()) > 0:
            return float(response.json()[0]['lat']), float(response.json()[0]['lon'])
        return 0.0, 0.0

    def get_weather_data(self, lat: float, lon: float):
        params = {
            "latitude": lat,
            "longitude": lon,
            "current": "temperature_2m,relative_humidity_2m,precipitation",
            "timezone": "auto"
        }
        res = requests.get(self.meteo_url, params=params)
        if res.status_code == 200:
            current = res.json().get('current', {})
            return {
                "temperature": current.get('temperature_2m', 0.0),
                "humidity": current.get('relative_humidity_2m', 0.0),
                "rainfall": current.get('precipitation', 0.0)
            }
        return {"temperature": 0.0, "humidity": 0.0, "rainfall": 0.0}

    def get_air_quality(self, lat: float, lon: float):
        params = {
            "coordinates": f"{lat},{lon}",
            "radius": 10000,
            "limit": 5,
            "parameter": ["pm25", "pm10"]
        }
        res = requests.get(self.openaq_url, params=params)
        aqi_data = {"aqi": 50, "pm25": 10.0, "pm10": 20.0} # Defaults
        if res.status_code == 200 and res.json().get('results'):
            results = res.json()['results']
            for r in results:
                if r['parameter'] == 'pm25':
                    aqi_data['pm25'] = r['value']
                    aqi_data['aqi'] = max(aqi_data['aqi'], r['value'] * 2.5) # Mock scaling PM2.5 to AQI
                elif r['parameter'] == 'pm10':
                    aqi_data['pm10'] = r['value']
        return aqi_data

    def fetch_zone_data(self, zone_name: str, pincode: str):
        lat, lon = self.get_coordinates(pincode)
        weather = self.get_weather_data(lat, lon)
        aqi = self.get_air_quality(lat, lon)
        
        return {
            "zone": zone_name,
            "rainfall": weather['rainfall'],
            "temperature": weather['temperature'],
            "humidity": weather['humidity'],
            "aqi": aqi['aqi'],
            "pm25": aqi['pm25'],
            "pm10": aqi['pm10'],
            "timestamp": datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%S")
        }
