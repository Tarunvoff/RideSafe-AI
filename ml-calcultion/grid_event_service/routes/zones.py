from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()

class ZoneStateResponse(BaseModel):
    h3_cell: str
    state: str
    active_riders: int
    lf_score: float

@router.get("/zones/{h3_cell}", response_model=ZoneStateResponse, tags=["Zones"])
async def get_zone_state(h3_cell: str):
    """
    Returns the real-time aggregated state of a specific H3 cell.
    This fetches from the Redis single source of truth.
    """
    import json
    from services.zone_aggregator import get_redis
    
    redis = get_redis()
    if redis is None:
        return {"h3_cell": h3_cell, "state": "UNKNOWN", "active_riders": 0, "lf_score": 0.0}
    
    raw = await redis.get(f"zone:{h3_cell}")
    if raw:
        data = json.loads(raw)
        return {
            "h3_cell": h3_cell,
            "state": data.get("zone_state", "UNKNOWN"),
            "active_riders": data.get("active_rider_count", 0),
            "lf_score": data.get("lf_score", 0.0),
        }
        
    return {"h3_cell": h3_cell, "state": "NORMAL", "active_riders": 0, "lf_score": 0.0}
