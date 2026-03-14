from app.integrations.ml_service_client import get_forecast_intelligence
from app.models.zone_risk import DiscountResponse

async def calculate_predictive_discount(zone_id: int, base_premium: float) -> DiscountResponse:
    forecast = await get_forecast_intelligence(zone_id)
    weekly_risk = forecast.get("weekly_disruption_probability", 1.0)
    
    discount_percent = 0.0
    discount_applied = False
    final_premium = base_premium
    
    if weekly_risk < 0.15:
        discount_percent = 10.0
        discount_applied = True
        final_premium = base_premium * (1.0 - (discount_percent / 100.0))
        
    return DiscountResponse(
        zone_id=zone_id,
        forecast_risk=weekly_risk,
        discount_applied=discount_applied,
        discount_percent=discount_percent,
        final_premium=round(final_premium, 2)
    )
