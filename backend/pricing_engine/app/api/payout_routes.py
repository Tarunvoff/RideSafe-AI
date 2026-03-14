from fastapi import APIRouter
from app.models.rider_policy import PayoutDeductionRequest
from app.services.deduction_service import deduct_premium
from app.integrations.platform_api_client import get_platform_payout

router = APIRouter(prefix="", tags=["Payout Engine"])

@router.post("/deduct-premium")
async def deduct_premium_endpoint(req: PayoutDeductionRequest):
    return await deduct_premium(
        rider_id=req.rider_id,
        weekly_premium=req.weekly_premium
    )

@router.get("/platform-payout/{rider_id}")
async def fetch_platform_payout(rider_id: int):
    # Mocking the platform payout API endpoint
    return await get_platform_payout(rider_id)
