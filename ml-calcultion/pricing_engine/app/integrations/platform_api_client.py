import logging

logger = logging.getLogger(__name__)

async def get_platform_payout(rider_id: int) -> dict:
    """
    Simulated Platform Payout API
    """
    return {
        "rider_id": rider_id,
        "weekly_earnings": 6800,
        "bonuses": 900,
        "total_payout": 7700
    }
