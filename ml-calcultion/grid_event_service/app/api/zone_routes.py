from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
from app.database import get_db
from app.services.zone_service import create_zone, get_all_zones

router = APIRouter(prefix="/zones", tags=["Zones"])

class ZoneCreate(BaseModel):
    name: str
    latitude: float
    longitude: float

class ZoneResponse(BaseModel):
    zone_id: int
    name: str
    latitude: float
    longitude: float
    grid_id: Optional[str] = None

    class Config:
        from_attributes = True

@router.post("", response_model=ZoneResponse)
def create_new_zone(zone: ZoneCreate, db: Session = Depends(get_db)):
    """
    Creates a new zone and automatically computes H3 grid id.
    """
    return create_zone(db, zone.name, zone.latitude, zone.longitude)

@router.get("", response_model=List[ZoneResponse])
def read_all_zones(db: Session = Depends(get_db)):
    """
    Returns all registered zones.
    """
    return get_all_zones(db)
