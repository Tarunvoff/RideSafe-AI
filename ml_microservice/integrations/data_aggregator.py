import time
import json
import logging
from datetime import datetime

from weather_service import WeatherService
from aqi_service import AQIService
from geolocation_service import GeolocationService
from civic_alert_service import CivicAlertService
from platform_activity_service import PlatformActivityService

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class DataAggregator:
    def __init__(self):
        self.weather_svc = WeatherService()
        self.aqi_svc = AQIService()
        self.geo_svc = GeolocationService()
        self.civic_svc = CivicAlertService()
        self.platform_svc = PlatformActivityService()

    def aggregate_zone_data(self, zone_name: str, pincode: str) -> dict:
        """
        Coordinates fetches across all integrations and normalizes the payload.
        """
        logger.info(f"Aggregating data for zone: {zone_name} ({pincode})")
        
        # 1. Geolocation
        coords = self.geo_svc.get_coordinates(pincode)
        lat, lon = coords['lat'], coords['lon']
        
        # 2. Weather & Environment
        weather = self.weather_svc.fetch_weather(lat, lon)
        
        # 3. AQI
        aqi = self.aqi_svc.fetch_aqi(lat, lon)
        
        # 4. Civic Alert
        # using 'Bangalore' as default city since these zones fall under Bangalore generally
        # In real life, reverse geocoding from lat/lon could provide the exact city
        civic_alert = self.civic_svc.check_civic_alert("Bangalore")
        
        # 5. Platform Activity
        activity = self.platform_svc.fetch_platform_activity(zone_name)
        
        # 6. Normalize into Unified Output
        unified_data = {
            "zone": zone_name,
            "latitude": lat,
            "longitude": lon,
            "rainfall": weather.get('rainfall', 0.0),
            "temperature": weather.get('temperature', 0.0),
            "aqi": aqi.get('aqi', 50.0),
            "pm25": aqi.get('pm25', 10.0),
            "platform_orders": activity.get('platform_orders', 0),
            "active_riders": activity.get('active_riders', 0),
            "civic_alert": civic_alert,
            "timestamp": datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%S")
        }
        
        return unified_data

def run_scheduler():
    """ Runs every 10 minutes """
    logger.info("Starting Data Aggregation Scheduler...")
    aggregator = DataAggregator()
    
    # Active zones configuration
    zones = [
        {"name": "Koramangala", "pincode": "560034"},
        {"name": "Indiranagar", "pincode": "560038"},
        {"name": "HSR Layout", "pincode": "560102"},
        {"name": "Whitefield", "pincode": "560066"}
    ]
    
    while True:
        logger.info("--- Starting 10-minute fetch cycle ---")
        for zone in zones:
            try:
                data = aggregator.aggregate_zone_data(zone['name'], zone['pincode'])
                logger.info(f"Unified Data [{zone['name']}]: \n{json.dumps(data, indent=2)}")
                
                # Here we could push the unified `data` dict to Kafka, Redis PubSub, 
                # or a downstream model inference pipeline.
                
            except Exception as e:
                logger.error(f"Aggregation failed for {zone['name']}: {e}", exc_info=True)
                
        logger.info("--- Cycle Complete. Sleeping for 10 minutes ---")
        time.sleep(600)  # 600 seconds = 10 minutes

if __name__ == "__main__":
    run_scheduler()
