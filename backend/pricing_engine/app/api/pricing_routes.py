from fastapi import APIRouter
from app.models.rider_policy import PremiumCalculationRequest
from app.models.zone_risk import OpportunityCostRequest, DiscountRequest
from app.services.microzone_pricing import calculate_weekly_premium
from app.services.opportunity_cost_engine import calculate_opportunity_payout
from app.services.forecast_discount_service import calculate_predictive_discount

router = APIRouter(prefix="", tags=["Pricing Engine"])

@router.post("/calculate-premium")
async def calculate_premium_endpoint(req: PremiumCalculationRequest):
    return await calculate_weekly_premium(
        rider_id=req.rider_id,
        zone_id=req.zone_id,
        base_premium=req.base_premium,
        income_multiplier=req.income_multiplier
    )

@router.post("/calculate-opportunity-payout")
async def calculate_opportunity_payout_endpoint(req: OpportunityCostRequest):
    return await calculate_opportunity_payout(req)

@router.post("/calculate-predictive-discount")
async def calculate_predictive_discount_endpoint(req: DiscountRequest):
    return await calculate_predictive_discount(req.zone_id, req.base_premium)
