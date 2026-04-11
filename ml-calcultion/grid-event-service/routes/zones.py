import time
import json
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from config import USE_REDIS, REDIS_URL, ZONE_KEY_TTL_SECONDS

router = APIRouter()

class ZoneStateResponse(BaseModel):
    h3_cell: str
    state: str
    active_riders: int
    lf_score: float


class ZoneStateUpdateRequest(BaseModel):
    lf_score: float = Field(..., ge=0.0, le=1.0)
    state: str = Field(..., min_length=3)
    active_riders: int = Field(0, ge=0)

@router.get("/zones/{h3_cell}", response_model=ZoneStateResponse, tags=["Zones"])
async def get_zone_state(h3_cell: str):
    """
    Returns the real-time aggregated state of a specific H3 cell.
    This fetches from the Redis single source of truth.
    """
    redis = None
    if USE_REDIS:
        try:
            import redis.asyncio as redislib  # type: ignore
            redis = redislib.from_url(REDIS_URL, decode_responses=True)
        except Exception:
            redis = None

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


@router.post("/zones/{h3_cell}/update", response_model=ZoneStateResponse, tags=["Zones"])
async def update_zone_state(h3_cell: str, payload: ZoneStateUpdateRequest):
    """
    Manual override endpoint for testing. Writes zone:{h3_cell} into Redis.
    """
    if not USE_REDIS:
        raise HTTPException(status_code=412, detail="USE_REDIS=false; enable Redis to set zone state")

    try:
        import redis.asyncio as redislib  # type: ignore
        redis = redislib.from_url(REDIS_URL, decode_responses=True)
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"Redis unavailable: {exc}")

    record = {
        "zone_state": payload.state,
        "lf_score": float(payload.lf_score),
        "active_rider_count": int(payload.active_riders),
        "source": "manual",
        "timestamp": time.time(),
    }

    await redis.setex(f"zone:{h3_cell}", ZONE_KEY_TTL_SECONDS, json.dumps(record))

    return {
        "h3_cell": h3_cell,
        "state": payload.state,
        "active_riders": payload.active_riders,
        "lf_score": payload.lf_score,
    }
