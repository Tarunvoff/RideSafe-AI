from pydantic import BaseModel

class OpportunityCostRequest(BaseModel):
    zone_id: int
    platform_orders: int
    active_riders: int
    surge_multiplier: float
    lost_orders_estimate: int
    base_delivery_value: float = 35.0

class OpportunityCostResponse(BaseModel):
    zone_id: int
    lost_orders: int
    surge_multiplier: float
    estimated_income_loss: float

class DiscountRequest(BaseModel):
    zone_id: int
    base_premium: float = 60.0

class DiscountResponse(BaseModel):
    zone_id: int
    forecast_risk: float
    discount_applied: bool
    discount_percent: float
    final_premium: float
