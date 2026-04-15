"""
services/platform_activity_service.py

Async platform activity fetcher.
Ported from: ml_microservice/integrations/platform_activity_service.py

Generates calibrated fallback orders + riders priors per zone,
then computes demand_ratio = active_orders / active_riders.

In production: replace calibrated fallback estimation with live platform API call.
"""

import random
import logging

logger = logging.getLogger(__name__)


from config import USE_CALIBRATED_FALLBACK_PRIOR, PLATFORM_API_URL, PLATFORM_TIMEOUT_SEC

async def fetch_platform_activity(zone_seed: str) -> dict:
    """
    Returns {
        "active_orders": int,
        "active_riders": int,
        "demand_ratio": float,   # orders / riders — higher means higher demand
        "order_density": float,
        "sla_breach_rate": float,
        "avg_delivery_delay_min": float,
        "is_fallback": bool,
        "source": str,
    }
    Seeded on zone for determinism within a session.
    """
    if not USE_CALIBRATED_FALLBACK_PRIOR:
        import httpx
        try:
            async with httpx.AsyncClient(timeout=PLATFORM_TIMEOUT_SEC) as client:
                resp = await client.get(f"{PLATFORM_API_URL}?zone={zone_seed}")
                resp.raise_for_status()
                data = resp.json()
                active_orders = int(data.get("active_orders", data.get("orders", 0)) or 0)
                active_riders = int(data.get("active_riders", data.get("riders", 0)) or 0)
                demand_ratio = float(data.get("demand_ratio", 0.0) or 0.0)
                if demand_ratio <= 0 and (active_orders or active_riders):
                    demand_ratio = round(active_orders / max(active_riders, 1), 4)
                return {
                    "active_orders": active_orders,
                    "active_riders": active_riders,
                    "demand_ratio": demand_ratio,
                    "order_density": float(data.get("order_density", demand_ratio)),
                    "sla_breach_rate": float(data.get("sla_breach_rate", 0.0)),
                    "avg_delivery_delay_min": float(data.get("avg_delivery_delay_min", 0.0)),
                    "is_fallback": False,
                    "source": "platform_api",
                }
        except Exception as exc:
            logger.warning("Failed to fetch real platform activity for %s: %s", zone_seed, exc)
            # Fall through to deterministic calibrated fallback prior on failure for resilience

    rng = random.Random(hash(zone_seed))
    orders = rng.randint(10, 200)
    riders = max(5, int(orders * rng.uniform(0.3, 0.8)))
    demand_ratio = round(orders / max(riders, 1), 4)
    order_density = demand_ratio
    sla_breach_rate = round(rng.uniform(0.02, 0.18), 3)
    avg_delay = round(rng.uniform(18, 42), 2)

    logger.info(f"Platform Activity [{zone_seed}]: orders={orders}, riders={riders}, demand_ratio={demand_ratio}")
    return {
        "active_orders": orders,
        "active_riders": riders,
        "demand_ratio": demand_ratio,
        "order_density": order_density,
        "sla_breach_rate": sla_breach_rate,
        "avg_delivery_delay_min": avg_delay,
        "is_fallback": True,
        "source": "calibrated_fallback_prior",
    }
