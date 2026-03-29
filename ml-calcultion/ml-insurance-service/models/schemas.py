from pydantic import BaseModel, Field
from typing import Optional, Dict

# Risk Estimation Models
class WeatherInfo(BaseModel):
    rainfall: float
    temperature: float

class RiskScoreRequest(BaseModel):
    h3_cell: str
    weather: WeatherInfo
    aqi: float
    demand_ratio: float
    # Add optional features since they are needed by the ML model
    historical_disruption_frequency: Optional[float] = 0.5
    zone_volatility: Optional[float] = 0.5

class RiskScoreResponse(BaseModel):
    Lf: float
    risk_level: str

# Pricing Engine Models
class PricingRequest(BaseModel):
    Ew: float
    Lf: float
    M: float
    platform: Optional[str] = "uber" # Dynamically defines Ct
    Ct: Optional[float] = None       # Manual override
    demand_ratio: Optional[float] = 1.0
    zone_volatility: Optional[float] = 0.5

class PricingResponse(BaseModel):
    premium: float
    zone_multiplier: float

# Fraud Detection Models
class GPSInfo(BaseModel):
    latitude: float
    longitude: float
    speed: Optional[float] = 0.0
    h3_cell: Optional[str] = None
    h3_zone_consistency: Optional[float] = 1.0

class DeviceInfo(BaseModel):
    id: str
    mismatch: bool

class HistoryInfo(BaseModel):
    claims_filed: int
    claims_rejected: int
    has_history_in_zone: Optional[bool] = True

class FraudScoreRequest(BaseModel):
    gps: GPSInfo
    device: DeviceInfo
    history: HistoryInfo

class FraudScoreResponse(BaseModel):
    score: float
    label: str

# Trigger Engine Models
class TriggerRequest(BaseModel):
    h3_cell: str
    fraud_score: float

class TriggerResponse(BaseModel):
    decision: str
    Lf: float
    zone_state: str
