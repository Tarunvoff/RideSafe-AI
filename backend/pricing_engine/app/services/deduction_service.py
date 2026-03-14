from app.integrations.platform_api_client import get_platform_payout
from app.models.rider_policy import PayoutDeductionResponse

async def deduct_premium(rider_id: int, weekly_premium: float) -> PayoutDeductionResponse:
    payout_data = await get_platform_payout(rider_id)
    total_payout = payout_data.get("total_payout", 0.0)
    
    if total_payout >= weekly_premium:
        final_payout = total_payout - weekly_premium
        deducted = True
    else:
        final_payout = total_payout
        deducted = False
        
    return PayoutDeductionResponse(
        rider_id=rider_id,
        weekly_premium=weekly_premium,
        deducted=deducted,
        final_payout=round(final_payout, 2)
    )
