import httpx
import logging
from fastapi import HTTPException

logger = logging.getLogger(__name__)

ML_SERVICE_URL = "http://127.0.0.1:8000"

# Zone coordinates for real-ish forecast fallback
ZONE_COORDS = {
    1: (12.9352, 77.6245), # Koramangala
    2: (12.9784, 77.6408), # Indiranagar
    3: (12.9116, 77.6389), # HSR
}

async def get_zone_intelligence(zone_id: int) -> dict:
    """
    Fetch zone intelligence from ML microservice.
    """
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{ML_SERVICE_URL}/zone-intelligence/{zone_id}", timeout=45.0)
            response.raise_for_status()
            return response.json()
    except Exception as e:
        logger.error(f"Failed to fetch zone intelligence from ML service for zone {zone_id}: {e}")
        raise HTTPException(status_code=503, detail="ML Service Unavailable")

async def get_forecast_intelligence(zone_id: int) -> dict:
    """
    Fetch 7-day forecast intelligence using Open-Meteo.
    """
    lat, lon = ZONE_COORDS.get(zone_id, (12.9716, 77.5946))
    
    # Use real Open-Meteo API for 'rain_probability' and 'heat_index' (apparent temperature)
    try:
        url = "https://api.open-meteo.com/v1/forecast"
        params = {
            "latitude": lat,
            "longitude": lon,
            "daily": "precipitation_probability_max,apparent_temperature_max,showers_sum",
            "timezone": "auto"
        }
        async with httpx.AsyncClient() as client:
            res = await client.get(url, params=params, timeout=5.0)
            res.raise_for_status()
            data = res.json()
            
            daily = data.get("daily", {})
            max_prob = max(daily.get("precipitation_probability_max", [0]))
            avg_heat = sum(daily.get("apparent_temperature_max", [30])) / max(len(daily.get("apparent_temperature_max", [30])), 1)
            storm_prob = min(max_prob / 100 * 0.4, 1.0) # Estimated storm prob from rain prob
            
            # Simple ML estimation for disruption probability based on weather
            weekly_disruption_probability = 0.05
            if max_prob > 50:
                weekly_disruption_probability += 0.2
            if storm_prob > 0.2:
                weekly_disruption_probability += 0.3
                
    except Exception as e:
        logger.error(f"Failed to fetch real forecast: {e}")
        raise HTTPException(status_code=503, detail="Weather Forecast Service Unavailable")

    return {
        "zone_id": zone_id,
        "weekly_disruption_probability": min(weekly_disruption_probability, 1.0),
        "rain_probability": max_prob / 100.0,
        "heat_index": round(avg_heat, 2),
        "storm_probability": storm_prob,
        "aqi_forecast": 120 # Still mocked since there is no standard 7-day AQI forecast API that is free/simple
    }
