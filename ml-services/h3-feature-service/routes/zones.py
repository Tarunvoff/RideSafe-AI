import json
import os
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
    Returns the last known zone state from Redis for the given H3 cell.
    """
    redis_url = os.getenv("REDIS_URL", "")
    if not redis_url:
        return {"h3_cell": h3_cell, "state": "UNKNOWN", "active_riders": 0, "lf_score": 0.0}

    try:
        import redis.asyncio as redislib  # type: ignore
        redis = redislib.from_url(redis_url, decode_responses=True)
    except Exception:
        return {"h3_cell": h3_cell, "state": "UNKNOWN", "active_riders": 0, "lf_score": 0.0}

    raw = await redis.get(f"zone:{h3_cell}")
    if raw:
        data = json.loads(raw)
        return {
            "h3_cell": h3_cell,
            "state": data.get("zone_state", "NORMAL"),
            "active_riders": data.get("active_rider_count", 0),
            "lf_score": data.get("lf_score", 0.0),
        }

    return {"h3_cell": h3_cell, "state": "NORMAL", "active_riders": 0, "lf_score": 0.0}
