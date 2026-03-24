import httpx
import logging

logger = logging.getLogger(__name__)

GRID_SERVICE_URL = "http://127.0.0.1:8001"

async def get_grid_state(zone_id: int) -> dict:
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{GRID_SERVICE_URL}/grid-state/zone/{zone_id}", timeout=5.0)
            response.raise_for_status()
            return response.json()
    except Exception as e:
        logger.error(f"Could not reach Grid service for zone {zone_id}: {e}")
        from fastapi import HTTPException
        raise HTTPException(status_code=503, detail="Grid Service Unavailable")
