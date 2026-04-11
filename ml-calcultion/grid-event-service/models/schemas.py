from pydantic import BaseModel
from typing import Optional


class DriverLocationPayload(BaseModel):
    driverId: str
    lat: float
    lng: float
    speed: Optional[float] = None
    timestamp: float
    platform: str
    h3_cell: Optional[str] = None  # Populated by Kafka producer


class ZoneStateUpdate(BaseModel):
    h3_cell: str
    old_state: str
    new_state: str
    lf_score: float
    timestamp: float
