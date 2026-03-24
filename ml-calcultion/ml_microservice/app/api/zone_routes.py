from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db import get_db
from app.services.zone_intelligence_service import calculate_zone_intelligence
from app.services.redis_cache import get_cached_zone_data, set_cached_zone_data
from app.models.database import EnvironmentData, Zone
from pydantic import BaseModel
from datetime import datetime
from typing import Optional

router = APIRouter(tags=["Zone Intelligence"])

class EnvironmentDataInput(BaseModel):
    zone: str
    latitude: float
    longitude: float
    rainfall: float
    temperature: float
    aqi: float
    pm25: float
    platform_orders: int
    active_riders: int
    civic_alert: bool
    timestamp: datetime

@router.post("/internal/environment-data")
def ingest_environment_data(data: EnvironmentDataInput, db: Session = Depends(get_db)):
    """Ingest data from the data aggregator script"""
    # 1. Find the zone
    zone = db.query(Zone).filter(Zone.name == data.zone).first()
    if not zone:
        # Create zone if it doesn't exist yet
        zone = Zone(name=data.zone, latitude=data.latitude, longitude=data.longitude)
        db.add(zone)
        db.commit()
        db.refresh(zone)
        
    # 2. Insert environment record
    env_record = EnvironmentData(
        zone_id=zone.id,
        timestamp=data.timestamp,
        temperature_c=data.temperature,
        rainfall_mm=data.rainfall,
        aqi_level=data.aqi,
        pm25=data.pm25,
        platform_orders=data.platform_orders,
        active_riders_count=data.active_riders,
        platform_outage_severity=0.0
    )
    db.add(env_record)
    db.commit()
    
    # 3. Invalidate Redis Cache (best-effort — Redis may not be running)
    try:
        import app.services.redis_cache as redis_cache
        if redis_cache.redis_client:
            redis_cache.redis_client.delete(f"zone_intelligence_{zone.id}")
    except Exception:
        pass

    return {"status": "success", "zone_id": zone.id}

@router.get("/zone-intelligence/{zone_id}")
def get_zone_intelligence(zone_id: int, db: Session = Depends(get_db)):
    """Returns the real-time aggregated environmental state for a delivery zone."""
    # Check cache first
    cached_data = get_cached_zone_data(zone_id)
    if cached_data:
        return cached_data
        
    # Fetch from real logic
    data = calculate_zone_intelligence(zone_id, db)
    
    # Store in cache
    set_cached_zone_data(zone_id, data, expire=30)
    return data
