from pydantic import BaseModel
from typing import Optional

class PremiumCalculationRequest(BaseModel):
    rider_id: int
    zone_id: int
    base_premium: float = 30.0
    income_multiplier: float = 1.0

class PremiumCalculationResponse(BaseModel):
    rider_id: int
    zone_id: int
    zone_risk_score: float
    weekly_premium: float

class PayoutDeductionRequest(BaseModel):
    rider_id: int
    weekly_premium: float

class PayoutDeductionResponse(BaseModel):
    rider_id: int
    weekly_premium: float
    deducted: bool
    final_payout: float
