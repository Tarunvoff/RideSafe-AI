import os
import sys
import joblib
import pandas as pd
import datetime
from sqlalchemy.orm import Session
from app.models.database import EnvironmentData, Rider, Zone

# Add integrations to path so we can import the live data services
_INTEGRATIONS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../integrations')
if _INTEGRATIONS_DIR not in sys.path:
    sys.path.insert(0, _INTEGRATIONS_DIR)

from weather_service import WeatherService
from aqi_service import AQIService

MODELS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../models')

# Fallback coordinates for known zones (used when DB lat/lon is 0 or missing)
ZONE_COORDS = {
    "Koramangala":     (12.9352, 77.6245),
    "Indiranagar":     (12.9784, 77.6408),
    "HSR Layout":      (12.9116, 77.6389),
    "Whitefield":      (12.9698, 77.7499),
    "Electronic City": (12.8399, 77.6770),
    "Marathahalli":    (12.9562, 77.7014),
}

_weather_svc = WeatherService()
_aqi_svc     = AQIService()


def get_risk_model():
    model_path = os.path.join(MODELS_DIR, "risk_model.pkl")
    if not os.path.exists(model_path):
        return None
    try:
        return joblib.load(model_path)
    except Exception as e:
        print(f"[WARN] Could not load risk_model.pkl: {e}")
        return None


def _fetch_live_env(lat: float, lon: float) -> dict:
    """
    Calls WeatherService + AQIService to get real-time environmental data.
    Returns a dict with temperature, rainfall, aqi, pm2_5.
    Falls back to safe defaults if both APIs fail.
    """
    result = {
        "temperature": 30.0,
        "rainfall":    0.0,
        "aqi":         80.0,
        "pm2_5":       30.0,
    }
    try:
        weather = _weather_svc.fetch_weather(lat, lon)
        result["temperature"] = weather.get("temperature", 30.0)
        result["rainfall"]    = weather.get("rainfall", 0.0)
    except Exception as e:
        print(f"[WARN] WeatherService failed for ({lat},{lon}): {e}")

    try:
        aqi_data = _aqi_svc.fetch_aqi(lat, lon)
        result["aqi"]   = aqi_data.get("aqi",  80.0)
        result["pm2_5"] = aqi_data.get("pm25", 30.0)
    except Exception as e:
        print(f"[WARN] AQIService failed for ({lat},{lon}): {e}")

    return result


def calculate_zone_intelligence(zone_id: int, db: Session):
    latest_env          = None
    active_riders_count = 0
    platform_orders     = 0
    base_risk           = 0.5
    zone_lat            = 12.9352   # Bengaluru default
    zone_lon            = 77.6245

    # ── 1. Query DB ───────────────────────────────────────────────────────────
    try:
        latest_env = (
            db.query(EnvironmentData)
            .filter(EnvironmentData.zone_id == zone_id)
            .order_by(EnvironmentData.timestamp.desc())
            .first()
        )
        active_riders_count = db.query(Rider).filter(
            Rider.zone_id == zone_id,
            Rider.is_active == True
        ).count()

        zone = db.query(Zone).filter(Zone.id == zone_id).first()
        if zone:
            base_risk = zone.base_risk_score or 0.5
            if zone.latitude and zone.longitude:
                zone_lat = zone.latitude
                zone_lon = zone.longitude
    except Exception as e:
        print(f"[WARN] DB query failed: {e}")

    now = datetime.datetime.now()

    # ── 2. Resolve environmental data ─────────────────────────────────────────
    if latest_env:
        # DB has fresh data — use it
        temperature     = latest_env.temperature_c
        rainfall        = latest_env.rainfall_mm
        aqi             = latest_env.aqi_level
        pm2_5           = latest_env.pm25 if latest_env.pm25 is not None else aqi * 0.4
        platform_orders = latest_env.platform_orders or 0
        active_riders_count = latest_env.active_riders_count or active_riders_count
        source = "database"
    else:
        # No DB record — call LIVE APIs using zone coordinates
        print(f"[INFO] No DB record for zone {zone_id}. Fetching live data ({zone_lat}, {zone_lon})...")
        live = _fetch_live_env(zone_lat, zone_lon)
        temperature     = live["temperature"]
        rainfall        = live["rainfall"]
        aqi             = live["aqi"]
        pm2_5           = live["pm2_5"]
        platform_orders = 0
        source = "live_api"

    # ── 3. ML risk prediction ─────────────────────────────────────────────────
    feature_df = pd.DataFrame({
        'rainfall_last_hour':  [rainfall],
        'rainfall_3hr_avg':    [rainfall * 0.8],
        'temperature_current': [temperature],
        'aqi_current':         [aqi],
        'aqi_trend':           [0.0],
        'zone_risk_score':     [base_risk],
        'season':              [1],
        'hour_of_day':         [now.hour],
        'day_of_week':         [now.weekday()],
        'month':               [now.month],
    })

    model = get_risk_model()
    if model:
        probability = float(model.predict_proba(feature_df)[0][1])
    else:
        probability = 0.85 if (rainfall > 35 or aqi > 250) else 0.1

    # ── 4. Risk level & grid state ────────────────────────────────────────────
    if probability > 0.6:
        risk_level = "HIGH"
    elif probability > 0.2:
        risk_level = "MEDIUM"
    else:
        risk_level = "LOW"

    if rainfall > 40 or probability > 0.8:
        grid_state = "HALTED"
    elif aqi > 300:
        grid_state = "DANGEROUS"
    elif 20 <= rainfall <= 40:
        grid_state = "SLOW"
    else:
        grid_state = "NORMAL"

    return {
        "zone_id":                zone_id,
        "temperature":            round(temperature, 2),
        "rainfall":               round(rainfall, 2),
        "aqi":                    round(aqi, 2),
        "pm2_5":                  round(pm2_5, 2),
        "active_riders":          active_riders_count,
        "platform_orders":        platform_orders,
        "disruption_probability": round(probability, 4),
        "risk_level":             risk_level,
        "recommended_grid_state": grid_state,
        "data_source":            source,          # tells you where data came from
        "timestamp":              now.isoformat(),
    }
