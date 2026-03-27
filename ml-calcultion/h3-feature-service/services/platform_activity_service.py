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


async def fetch_platform_activity(zone_seed: str) -> dict:
    """
    Returns {
        "platform_orders": int,
        "active_riders": int,
        "demand_ratio": float,   # riders / orders — lower means higher demand
    }
    Seeded on zone for determinism within a session.
    """
    rng = random.Random(hash(zone_seed))
    orders = rng.randint(10, 200)
    riders = max(5, int(orders * rng.uniform(0.3, 0.8)))
    demand_ratio = round(orders / max(riders, 1), 4)

    logger.info(f"Platform Activity [{zone_seed}]: orders={orders}, riders={riders}, demand_ratio={demand_ratio}")
    return {
        "platform_orders": orders,
        "active_riders": riders,
        "demand_ratio": demand_ratio,
    }
