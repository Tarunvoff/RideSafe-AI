import os
import joblib
import pandas as pd
import datetime
import random
from sqlalchemy.orm import Session
from app.models.database import EnvironmentData, Rider, Zone

MODELS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../models')


def get_risk_model():
    model_path = os.path.join(MODELS_DIR, "risk_model.pkl")
    if os.path.exists(model_path):
        return joblib.load(model_path)
    return None


def calculate_zone_intelligence(zone_id: int, db: Session):
    latest_env = None
    active_riders_count = random.randint(10, 100)
    base_risk = 0.5

    try:
        # Fetch latest environment data
        latest_env = (
            db.query(EnvironmentData)
            .filter(EnvironmentData.zone_id == zone_id)
            .order_by(EnvironmentData.timestamp.desc())
            .first()
        )

        # Active riders
        active_riders_count = db.query(Rider).filter(
            Rider.zone_id == zone_id,
            Rider.is_active == True,
        ).count()

        # Get Zone
        zone = db.query(Zone).filter(Zone.id == zone_id).first()
        if zone:
            base_risk = zone.base_risk_score
    except Exception as e:
        print(f"Executing DB queries failed: {e}")

    now = datetime.datetime.now()

    if latest_env:
        temperature = latest_env.temperature_c
        rainfall = latest_env.rainfall_mm
        aqi = latest_env.aqi_level
        pm2_5 = latest_env.pm25 if latest_env.pm25 is not None else aqi * 0.4
        platform_orders = latest_env.platform_orders if latest_env.platform_orders is not None else 0
        active_riders_count = (
            latest_env.active_riders_count
            if latest_env.active_riders_count is not None
            else active_riders_count
        )
    else:
        # Defaults if no data found yet
        temperature = random.uniform(25.0, 35.0)
        rainfall = random.uniform(0.0, 50.0)
        aqi = random.uniform(50.0, 450.0)
        pm2_5 = aqi * 0.4
        platform_orders = 0

    # Predict risk
    feature_df = pd.DataFrame(
        {
            'rainfall_last_hour': [rainfall],
            'rainfall_3hr_avg': [rainfall * 0.8],
            'temperature_current': [temperature],
            'aqi_current': [aqi],
            'aqi_trend': [0.0],
            'zone_risk_score': [base_risk],
            'season': [1],
            'hour_of_day': [now.hour],
            'day_of_week': [now.weekday()],
            'month': [now.month],
        }
    )

    model = get_risk_model()
    if model:
        probability = float(model.predict_proba(feature_df)[0][1])
    else:
        probability = 0.85 if (rainfall > 35 or aqi > 250) else 0.1

    # Risk Level
    if probability > 0.6:
        risk_level = "HIGH"
    elif probability > 0.2:
        risk_level = "MEDIUM"
    else:
        risk_level = "LOW"

    # Grid State Rules
    if rainfall > 40 or probability > 0.8:
        grid_state = "HALTED"
    elif aqi > 300:
        grid_state = "DANGEROUS"
    elif 20 <= rainfall <= 40:
        grid_state = "SLOW"
    else:
        grid_state = "NORMAL"

    return {
        "zone_id": zone_id,
        "temperature": round(temperature, 2),
        "rainfall": round(rainfall, 2),
        "aqi": round(aqi, 2),
        "pm2_5": round(pm2_5, 2),
        "active_riders": active_riders_count,
        "platform_orders": platform_orders,
        "disruption_probability": round(probability, 4),
        "risk_level": risk_level,
        "recommended_grid_state": grid_state,
        "timestamp": now.isoformat(),
    }