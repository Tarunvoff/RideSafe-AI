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
    cached_data = get_cached_zone_data(zone_id)
    if cached_data:
        return cached_data
    data = calculate_zone_intelligence(zone_id, db)
    set_cached_zone_data(zone_id, data, expire=30)
    return data


@router.get("/zone-intelligence/by-name/{zone_name}")
def get_zone_intelligence_by_name(
    zone_name: str,
    lat: Optional[float] = None,
    lon: Optional[float] = None,
    db: Session = Depends(get_db),
):
    """
    Returns live environmental intelligence for a zone identified by name.
    If lat/lon are supplied they are used directly (no DB lookup needed).
    Called by the Grid Event Microservice.
    """
    # Try to find zone in ML DB by name
    zone = db.query(Zone).filter(Zone.name == zone_name).first()

    if zone:
        zone_id   = zone.id
        zone_lat  = zone.latitude  if (zone.latitude  and zone.latitude  != 0) else lat
        zone_lon  = zone.longitude if (zone.longitude and zone.longitude != 0) else lon
    elif lat and lon:
        # Zone not in ML DB yet — create it on the fly with the supplied coords
        zone = Zone(name=zone_name, latitude=lat, longitude=lon, base_risk_score=0.35)
        db.add(zone)
        db.commit()
        db.refresh(zone)
        zone_id  = zone.id
        zone_lat = lat
        zone_lon = lon
    else:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail=f"Zone '{zone_name}' not found and no lat/lon provided")

    # Temporarily patch the zone coords so zone_intelligence_service picks them up
    zone.latitude  = zone_lat
    zone.longitude = zone_lon

    cached = get_cached_zone_data(zone_id)
    if cached:
        return cached

    data = calculate_zone_intelligence(zone_id, db)
    set_cached_zone_data(zone_id, data, expire=30)
    return data
