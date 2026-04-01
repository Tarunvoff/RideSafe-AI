"""
services/platform_activity_service.py

Async platform activity fetcher.
Ported from: ml_microservice/integrations/platform_activity_service.py

Generates realistic mock orders + riders data per zone,
then computes demand_ratio = active_riders / platform_orders.

In production: replace _mock_activity with real platform API call.
"""

import random
import logging

logger = logging.getLogger(__name__)


from config import USE_MOCK_DATA, PLATFORM_API_URL

async def fetch_platform_activity(zone_seed: str) -> dict:
    """
    Returns {
        "platform_orders": int,
        "active_riders": int,
        "demand_ratio": float,   # orders / riders — higher means higher demand
        "is_fallback": bool,
        "source": str,
    }
    Seeded on zone for determinism within a session.
    """
    if not USE_MOCK_DATA:
        import httpx
        try:
            async with httpx.AsyncClient(timeout=3.0) as client:
                resp = await client.get(f"{PLATFORM_API_URL}?zone={zone_seed}")
                resp.raise_for_status()
                data = resp.json()
                return {
                    "platform_orders": data.get("orders", 0),
                    "active_riders": data.get("riders", 0),
                    "demand_ratio": data.get("demand_ratio", 1.0),
                    "is_fallback": False,
                    "source": "platform_api",
                }
        except Exception as exc:
            logger.warning("Failed to fetch real platform activity for %s: %s", zone_seed, exc)
            # Fall through to deterministic mock on failure for resilience

    rng = random.Random(hash(zone_seed))
    orders = rng.randint(10, 200)
    riders = max(5, int(orders * rng.uniform(0.3, 0.8)))
    demand_ratio = round(orders / max(riders, 1), 4)

    logger.info(f"Platform Activity [{zone_seed}]: orders={orders}, riders={riders}, demand_ratio={demand_ratio}")
    return {
        "platform_orders": orders,
        "active_riders": riders,
        "demand_ratio": demand_ratio,
        "is_fallback": True,
        "source": "mock",
    }
