from app.models.zone_risk import OpportunityCostRequest, OpportunityCostResponse

async def calculate_opportunity_payout(req: OpportunityCostRequest) -> OpportunityCostResponse:
    surge_delivery_value = req.base_delivery_value * req.surge_multiplier
    surge_loss = req.lost_orders_estimate * surge_delivery_value
    
    return OpportunityCostResponse(
        zone_id=req.zone_id,
        lost_orders=req.lost_orders_estimate,
        surge_multiplier=req.surge_multiplier,
        estimated_income_loss=round(surge_loss, 2)
    )
