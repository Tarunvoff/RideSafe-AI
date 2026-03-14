from app.integrations.ml_service_client import get_zone_intelligence
from app.utils.risk_formula import calculate_zone_risk_score
from app.models.rider_policy import PremiumCalculationResponse

async def calculate_weekly_premium(rider_id: int, zone_id: int, base_premium: float, income_multiplier: float) -> PremiumCalculationResponse:
    # 1. Fetch zone intelligence (real or mocked)
    zone_intel = await get_zone_intelligence(zone_id)
    
    # 2. Extract elements or mock out the missing ones
    disruption_prob = zone_intel.get("disruption_probability", 0.0)
    
    # Convert rainfall to normalized value (e.g. out of 100mm)
    rainfall = zone_intel.get("rainfall", 0.0)
    rainfall_norm = min(rainfall / 100.0, 1.0)
    
    # Mock for unprovided feature
    flood_risk_index = 0.2
    
    # Normalize AQI (e.g., out of 500)
    aqi = zone_intel.get("aqi", 0.0)
    pollution_risk = min(aqi / 500.0, 1.0)
    
    # Mock for other unprovided features
    traffic_disruption = 0.3
    historical_claim_rate = 0.05
    
    score = calculate_zone_risk_score(
        disruption_probability=disruption_prob,
        rainfall_normalized=rainfall_norm,
        flood_risk_index=flood_risk_index,
        pollution_risk=pollution_risk,
        traffic_disruption=traffic_disruption,
        historical_claim_rate=historical_claim_rate
    )
    
    # 3. Premium Calculation
    premium = base_premium + (score * 50.0)
    premium = premium * income_multiplier
    
    weekly_premium = round(premium, 2)
    
    return PremiumCalculationResponse(
        rider_id=rider_id,
        zone_id=zone_id,
        zone_risk_score=round(score, 4),
        weekly_premium=weekly_premium
    )
